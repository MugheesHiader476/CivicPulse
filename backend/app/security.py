from ipaddress import ip_address, ip_network

from fastapi import Request


def client_ip(request: Request) -> str:
    peer = request.client.host if request.client else "unknown"
    try:
        peer_address = ip_address(peer)
    except ValueError:
        return peer
    cidrs = request.app.state.settings.trusted_proxy_cidrs
    if not any(peer_address in ip_network(cidr.strip()) for cidr in cidrs.split(",") if cidr.strip()):
        return peer
    forwarded = request.headers.get("X-Real-IP", "")
    try:
        return str(ip_address(forwarded))
    except ValueError:
        return peer
