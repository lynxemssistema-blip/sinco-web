# SINCO-WEB: Network Access Guide

This document describes how to access the SINCO-WEB system from other devices on the local network.

## Access Details

- **Address**: `http://192.168.1.11:5173`
- **Port**: 5173 (Frontend)

## Troubleshooting Remote Access

If you cannot reach the address above from another computer:

1.  **Network**: Ensure both the server and the local device are on the same Wi-Fi/Ethernet network (`lan`).
2.  **Firewall**: The `setup_network_service.ps1` script should have opened the ports. If not, verify Windows Firewall rules for port **5173** and **3000**.
3.  **Antivirus**: Some third-party antivirus software (Avast, Norton, etc.) have their own firewalls that might block incoming connections.

## System Maintenance

The system is managed by **PM2**. It runs in the background.

- To check status: `pm2 status`
- To restart: `pm2 restart all`
- To view logs: `pm2 logs`
