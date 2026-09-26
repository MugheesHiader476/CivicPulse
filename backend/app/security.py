from ipaddress import ip_address, ip_network

from fastapi import Request


def client_ip(request: Request) -> str:
    peer = request.client.host if request.client else "unknown"
    try:
        peer_address = ip_address(peer)
    except ValueError:
        return peer
    cidrs = request.app.state.settings.trusted_proxy_cidrs
    trusted_proxy = False
    for cidr in (value.strip() for value in cidrs.split(",") if value.strip()):
        try:
            if peer_address in ip_network(cidr):
                trusted_proxy = True
                break
        except ValueError:
            continue
    if not trusted_proxy:
        return peer
    forwarded = request.headers.get("X-Real-IP", "")
    try:
        return str(ip_address(forwarded))
    except ValueError:
        return peer
