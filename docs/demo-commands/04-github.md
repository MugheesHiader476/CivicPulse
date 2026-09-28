# Part 4 - Mughees - CI/CD and closing

Open the successful CI run:

`https://github.com/MugheesHiader476/CivicPulse/actions/runs/36442947082`

Open the CD workflow page:

`https://github.com/MugheesHiader476/CivicPulse/actions/workflows/cd.yml`

After the final merge, open the specific successful CD run rather than only the workflow list.

Say: "CI tests, lints, builds, scans, validates manifests, and smoke-tests the stack. CD retests the
merged result, publishes SHA-tagged images and SBOMs, deploys to an ephemeral Kubernetes cluster,
and smoke-tests through Ingress. Protected main requires partner approval and every required check."
