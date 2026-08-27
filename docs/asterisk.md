# Asterisk & Zoiper Integration Guide

This guide details how to configure Asterisk PBX to connect with the NexusDial platform and configure Zoiper softphones for agents.

---

## 1. Asterisk AMI Configuration (`/etc/asterisk/manager.conf`)

Enable the Asterisk Manager Interface (AMI) so the Node.js backend can originate and control calls:

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[autodialer]
secret = your_strong_ami_password
read = system,call,log,verbose,command,agent,user,originate
write = system,call,log,verbose,command,agent,user,originate
```

Reload Asterisk manager:
```bash
asterisk -rx "manager reload"
```

---

## 2. Agent SIP Extensions (`/etc/asterisk/pjsip.conf`)

Configure agent SIP endpoints (e.g. Extension `101`):

```ini
; Transport
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

; Agent 101 Endpoint
[101]
type=endpoint
context=from-internal
disallow=all
allow=ulaw,alaw,opus
auth=auth101
aors=101

[auth101]
type=auth
auth_type=userpass
password=agent_secret_101
username=101

[101]
type=aor
max_contacts=1
```

Reload PJSIP:
```bash
asterisk -rx "pjsip reload"
```

---

## 3. Dialplan Configuration (`/etc/asterisk/extensions.conf`)

Configure dialplan routing for outbound carrier and agent softphone bridge:

```ini
[from-internal]
; Route to Agent Softphones
exten => 101,1,NoOp(Connecting to Agent 101)
 same => n,Dial(PJSIP/101,30)
 same => n,Hangup()

exten => 102,1,NoOp(Connecting to Agent 102)
 same => n,Dial(PJSIP/102,30)
 same => n,Hangup()

; Outbound Calling Context
[outbound-dialer]
exten => _+X.,1,NoOp(Outbound Dialer Call to ${EXTEN})
 same => n,Set(CALL_RECORDING_NAME=/var/spool/asterisk/monitor/${CALL_ID}.wav)
 same => n,MixMonitor(${CALL_RECORDING_NAME},b)
 same => n,Dial(PJSIP/${EXTEN}@outbound_trunk,45)
 same => n,Hangup()
```

Reload dialplan:
```bash
asterisk -rx "dialplan reload"
```

---

## 4. Zoiper Softphone Setup for Agents

1. Download and install **Zoiper 5** (Windows / macOS / Linux).
2. Open Zoiper Settings ➔ **Add Account**:
   - **Account Type**: SIP
   - **User / User@host**: `101@<YOUR_ASTERISK_SERVER_IP>`
   - **Password**: `agent_secret_101`
   - **Domain / Outbound Proxy**: `<YOUR_ASTERISK_SERVER_IP>:5060`
3. Click **Finish**. Zoiper will show **"Account is ready (SIP)"** with a green checkmark.
4. When an outbound call is answered, Asterisk will immediately ring the agent's Zoiper softphone with crystal-clear two-way audio.
