#!/bin/bash
# Setup passwordless sudo for linux-dashboard
# Run this ONCE on the server: sudo bash scripts/setup-sudoers.sh

USERNAME="codewalker"

cat > /etc/sudoers.d/linux-dashboard << 'EOF'
# Linux Dashboard - passwordless sudo for system management commands
codewalker ALL=(ALL) NOPASSWD: /usr/bin/apt-get
codewalker ALL=(ALL) NOPASSWD: /usr/bin/apt
codewalker ALL=(ALL) NOPASSWD: /usr/bin/dpkg
codewalker ALL=(ALL) NOPASSWD: /sbin/insmod
codewalker ALL=(ALL) NOPASSWD: /sbin/rmmod
codewalker ALL=(ALL) NOPASSWD: /sbin/modprobe
codewalker ALL=(ALL) NOPASSWD: /usr/bin/dmesg
codewalker ALL=(ALL) NOPASSWD: /usr/bin/timedatectl
codewalker ALL=(ALL) NOPASSWD: /usr/bin/systemctl
codewalker ALL=(ALL) NOPASSWD: /usr/bin/strace
codewalker ALL=(ALL) NOPASSWD: /usr/bin/chmod
codewalker ALL=(ALL) NOPASSWD: /usr/bin/chown
codewalker ALL=(ALL) NOPASSWD: /usr/bin/mknod
codewalker ALL=(ALL) NOPASSWD: /usr/bin/tee
EOF

chmod 440 /etc/sudoers.d/linux-dashboard
visudo -c -f /etc/sudoers.d/linux-dashboard

if [ $? -eq 0 ]; then
  echo "✅ Sudoers configured successfully for $USERNAME"
  echo "   No password required for: apt, insmod, rmmod, dmesg, timedatectl, strace, etc."
else
  echo "❌ Sudoers syntax error! Removing file..."
  rm -f /etc/sudoers.d/linux-dashboard
  exit 1
fi
