[CmdletBinding()]
param(
    [switch]$LocalAi
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

function Import-DotEnv {
    param([Parameter(Mandatory)][string]$Path)

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
            continue
        }
        $name, $value = $trimmed -split "=", 2
        [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
    }
}

$envPath = Join-Path $repoRoot ".env"
if (-not (Test-Path -LiteralPath $envPath)) {
    $randomBytes = [byte[]]::new(24)
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
    $password = ($randomBytes | ForEach-Object { $_.ToString("x2") }) -join ""
    $envLines = @(
        "POSTGRES_PASSWORD=$password"
        "AUTH_MODE=demo"
        "TRIAGE_PROVIDER=rules"
        "GROQ_API_KEY="
        "# Clerk user IDs permitted to use the Admin dashboard (comma-separated)"
        "CLERK_OPERATOR_USER_IDS=demo_operator"
    )
    [IO.File]::WriteAllLines($envPath, $envLines, [Text.UTF8Encoding]::new($false))
}

Import-DotEnv -Path $envPath
$authMode = if ($env:AUTH_MODE) { $env:AUTH_MODE } else { "demo" }

if ($authMode -eq "clerk") {
    $clerkPath = Join-Path $repoRoot "frontend/.env.local"
    if (-not (Test-Path -LiteralPath $clerkPath)) {
        throw "AUTH_MODE=clerk requires frontend/.env.local. Run 'clerk env pull' in frontend/."
    }
    Import-DotEnv -Path $clerkPath
    if (-not $env:CLERK_PUBLISHABLE_KEY) {
        $env:CLERK_PUBLISHABLE_KEY = $env:VITE_CLERK_PUBLISHABLE_KEY
    }
    if (-not $env:CLERK_SECRET_KEY -or $env:CLERK_PUBLISHABLE_KEY -notmatch '^pk_(test|live)_[A-Za-z0-9_=-]+$') {
        throw "Clerk keys are incomplete. Re-run 'clerk env pull' in frontend/."
    }

    $encodedDomain = $env:CLERK_PUBLISHABLE_KEY -replace '^pk_(test|live)_', ''
    $encodedDomain = $encodedDomain.Replace('_', '/').Replace('-', '+')
    while ($encodedDomain.Length % 4) { $encodedDomain += '=' }
    try {
        $decodedDomain = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encodedDomain))
    } catch {
        throw "Could not decode the Clerk publishable key."
    }
    if ($decodedDomain -notmatch '^[A-Za-z0-9.-]+\$$') {
        throw "Clerk publishable key does not contain a valid frontend API domain."
    }
    $env:CLERK_FRONTEND_API_ORIGIN = "https://$($decodedDomain.TrimEnd('$'))"
}

docker compose build backend
if ($LASTEXITCODE) { throw "Backend image build failed." }
docker compose build frontend
if ($LASTEXITCODE) { throw "Frontend image build failed." }
docker compose up -d --no-build
if ($LASTEXITCODE) { throw "Compose startup failed." }

if ($LocalAi) {
    docker compose --profile local-ai up -d --wait ollama
    if ($LASTEXITCODE) { throw "Ollama startup failed." }
    docker compose --profile local-ai exec -T ollama sh -c 'ollama pull "$OLLAMA_MODEL"'
    if ($LASTEXITCODE) { throw "Ollama model download failed." }
    docker compose --profile local-ai exec -T ollama sh -c 'ollama run "$OLLAMA_MODEL" "Reply only ready." >/dev/null'
    if ($LASTEXITCODE) { throw "Ollama model warm-up failed." }
}

docker compose exec -T backend python -m app.seed
if ($LASTEXITCODE) { throw "Database seed failed." }

if ($authMode -eq "demo") {
    Write-Output "Citizen demo:  http://127.0.0.1:8080/?demo_role=citizen"
    Write-Output "Operator demo: http://127.0.0.1:8080/?demo_role=operator"
} else {
    Write-Output "CivicPulse: http://127.0.0.1:8080/sign-in"
}
