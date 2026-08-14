# Partner Domain Automation

This setup makes partner domains automatic after a one-time server configuration.

Flow:

1. Platform admin creates a superadmin.
2. Platform admin adds the partner domain.
3. Platform admin marks the domain active.
4. Partner points DNS to the SaaS server.
5. Caddy checks `/api/tenant/allow-domain` and issues SSL automatically.

The app only allows domains that are active in `white_label_domains`.

## Recommended Caddy Setup

Install Caddy on the server, then use this Caddyfile:

```caddyfile
{
	email admin@your-saas-domain.com
	on_demand_tls {
		ask http://127.0.0.1:5000/api/tenant/allow-domain
	}
}

:80, :443 {
	tls {
		on_demand
	}

	reverse_proxy 127.0.0.1:5000 {
		header_up Host {host}
		header_up X-Forwarded-Host {host}
		header_up X-Forwarded-Proto {scheme}
		header_up X-Real-IP {remote_host}
	}
}
```

Reload Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Partner DNS

For each partner, they only need DNS:

```txt
A      partnerdomain.com      YOUR_SERVER_IP
A      www.partnerdomain.com  YOUR_SERVER_IP
```

For a subdomain:

```txt
CNAME  app.partnerdomain.com  your-saas-domain.com
```

or:

```txt
A      app.partnerdomain.com  YOUR_SERVER_IP
```

## Testing

After adding and activating `terraon.in` in Platform Admin:

```bash
curl -i "http://127.0.0.1:5000/api/tenant/allow-domain?domain=terraon.in"
```

Expected:

```json
{"allowed":true}
```

Then open:

```txt
https://terraon.in/api/tenant/current
```

It should return the matched tenant/superadmin.

If it returns `403` from `/api/tenant/allow-domain`, the domain is not active in Platform Admin or the domain text does not match.

## Notes

- Do not use open on-demand TLS without the `ask` endpoint. That would allow anyone to point random domains at your server.
- Nginx plus Certbot usually needs per-domain certificate commands. Caddy on-demand TLS removes that manual per-domain SSL step.
- The only per-partner operational step left is DNS pointing by the partner or whoever controls their DNS.
