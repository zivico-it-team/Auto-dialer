# Troubleshooting Guide

## 1. Asterisk AMI Connection Failures

**Symptom**: Logs display `📞 [AsteriskAMI] Login failed: Authentication failed` or `Socket error: ECONNREFUSED`.

**Solutions**:
1. Verify Asterisk AMI is running: `asterisk -rx "manager show settings"`.
2. Check `manager.conf`: Ensure `enabled = yes`, `port = 5038`, and `bindaddr = 0.0.0.0` or `127.0.0.1`.
3. Check credentials match `.env`:
   ```env
   ASTERISK_HOST=127.0.0.1
   ASTERISK_PORT=5038
   ASTERISK_USERNAME=autodialer
   ASTERISK_PASSWORD=your_password
   ```
4. Verify firewall: `sudo ufw allow 5038/tcp`.

---

## 2. Zoiper Softphone Shows "Registration Failed"

**Symptom**: Zoiper displays error `403 Forbidden` or `408 Request Timeout`.

**Solutions**:
1. Ensure extension is configured in `/etc/asterisk/pjsip.conf`.
2. Check that password matches the `auth` section in Asterisk.
3. Test UDP connectivity to port 5060: `nc -v -u <ASTERISK_IP> 5060`.
4. Ensure RTP media ports (typically `10000-20000/udp`) are open in firewall.

---

## 3. Auto-Dialer Not Originating Calls

**Symptom**: Campaign is set to `RUNNING` but no calls are made.

**Checklist**:
1. **Calling Hours**: Check if the current time in the campaign's timezone is within `callingStartTime` and `callingEndTime`.
2. **Agent Readiness**: Ensure at least one agent is logged in and set to `AVAILABLE`.
3. **Eligible Leads**: Check if all leads have reached the retry limit or are in a retry cooldown delay window.
4. **Emergency Stop**: Check if the system was emergency halted. Click "Resume" on the campaign.

---

## 4. Socket.IO Disconnects / Reconnect Loops

**Symptom**: UI shows "Telemetry Reconnecting...".

**Solutions**:
1. Ensure Nginx configuration includes WebSocket upgrade headers:
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "Upgrade";
   ```
2. Verify token is present in browser LocalStorage (`auth_token`).
