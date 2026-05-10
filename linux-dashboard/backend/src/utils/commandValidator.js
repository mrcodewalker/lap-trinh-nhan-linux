/**
 * Command Validator - Security middleware to validate shell commands
 * Prevents dangerous command injection
 */

// Blacklisted dangerous commands
const BLACKLISTED_COMMANDS = [
  'rm -rf /',
  'rm -rf /*',
  'mkfs',
  'dd if=/dev/zero',
  'dd if=/dev/random',
  ':(){:|:&};:',  // fork bomb
  'chmod -R 777 /',
  'chown -R',
  '> /dev/sda',
  'shred',
  'wipefs',
];

// Allowed command prefixes for different roles
const ALLOWED_COMMANDS = {
  admin: ['*'], // admin can run anything
  user: [
    'ls', 'cat', 'echo', 'pwd', 'whoami', 'date', 'uptime',
    'ps', 'top', 'htop', 'df', 'du', 'free', 'uname',
    'ping', 'traceroute', 'nslookup', 'dig', 'netstat', 'ss',
    'ifconfig', 'ip', 'curl', 'wget',
    'find', 'grep', 'awk', 'sed', 'sort', 'uniq', 'wc',
    'tar', 'gzip', 'gunzip', 'zip', 'unzip',
    'chmod', 'chown', 'mkdir', 'touch', 'cp', 'mv',
    'systemctl status', 'journalctl', 'dmesg',
    'lsmod', 'modinfo',
    'apt list', 'apt search', 'dpkg -l',
    'git', 'python3', 'node', 'npm',
  ]
};

/**
 * Validate if a command is safe to execute
 * @param {string} command - The command to validate
 * @param {string} role - User role (admin/user)
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateCommand(command, role = 'user') {
  if (!command || typeof command !== 'string') {
    return { valid: false, reason: 'Invalid command format' };
  }

  const trimmed = command.trim();

  // Check blacklist
  for (const blacklisted of BLACKLISTED_COMMANDS) {
    if (trimmed.includes(blacklisted)) {
      return { valid: false, reason: `Command contains dangerous pattern: ${blacklisted}` };
    }
  }

  // Check for shell injection patterns
  const injectionPatterns = [
    /;\s*rm\s+-rf/,
    /&&\s*rm\s+-rf/,
    /\|\s*rm\s+-rf/,
    /`[^`]*`/,  // backtick execution
    /\$\([^)]*\)/,  // command substitution
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'Potential command injection detected' };
    }
  }

  // Admin can run anything (after blacklist check)
  if (role === 'admin') {
    return { valid: true };
  }

  // Check allowed commands for regular users
  const allowed = ALLOWED_COMMANDS[role] || ALLOWED_COMMANDS.user;
  if (allowed.includes('*')) return { valid: true };

  const isAllowed = allowed.some(prefix => trimmed.startsWith(prefix));
  if (!isAllowed) {
    return { valid: false, reason: `Command not allowed for role: ${role}` };
  }

  return { valid: true };
}

/**
 * Sanitize command arguments to prevent injection
 */
function sanitizeArg(arg) {
  if (typeof arg !== 'string') return '';
  // Remove shell special characters
  return arg.replace(/[;&|`$(){}[\]<>\\]/g, '');
}

module.exports = { validateCommand, sanitizeArg, BLACKLISTED_COMMANDS };
