/**
 * Linux concept knowledge base — dùng bởi <ExplainPanel/>.
 *
 * Mỗi entry trong CONCEPTS:
 *   {
 *     summary   : 1-2 câu giải thích.
 *     command   : (tuỳ) cú pháp lệnh shell.
 *     breakdown : (tuỳ) array { token, meaning } để bóc tách lệnh.
 *     syscalls  : array tên syscall liên quan (link tới SYSCALLS).
 *     concepts  : array tên Linux concept liên quan.
 *     flow      : (tuỳ) array các bước userspace → kernel.
 *     risks     : (tuỳ) string cảnh báo.
 *   }
 *
 * SYSCALLS map:  name → { signature, summary }.
 */

export const SYSCALLS = {
  fork: {
    signature: 'pid_t fork(void)',
    summary: 'Tạo process con bằng cách clone toàn bộ address space (COW). Trả về 0 trong child, PID child trong parent, -1 nếu lỗi.',
  },
  execve: {
    signature: 'int execve(const char *path, char *const argv[], char *const envp[])',
    summary: 'Thay nội dung process hiện tại bằng một executable mới. Không trả về nếu thành công.',
  },
  wait: {
    signature: 'pid_t wait(int *wstatus)',
    summary: 'Block parent đến khi child kết thúc. Đọc exit code để cleanup zombie.',
  },
  waitpid: {
    signature: 'pid_t waitpid(pid_t pid, int *wstatus, int options)',
    summary: 'Như wait() nhưng có thể chỉ định child cụ thể và non-blocking (WNOHANG).',
  },
  exit: {
    signature: 'void _exit(int status)',
    summary: 'Kết thúc process ngay lập tức, không chạy atexit handlers.',
  },
  open:  { signature: 'int open(const char *path, int flags, mode_t mode)', summary: 'Mở file → fd qua VFS layer.' },
  read:  { signature: 'ssize_t read(int fd, void *buf, size_t count)',     summary: 'Đọc từ fd. fd có thể là file, socket, pipe, character device.' },
  write: { signature: 'ssize_t write(int fd, const void *buf, size_t count)', summary: 'Ghi ra fd. Trả số byte thực ghi.' },
  close: { signature: 'int close(int fd)', summary: 'Đóng fd, giảm refcount, gọi release() trong driver nếu cần.' },
  socket: { signature: 'int socket(int domain, int type, int protocol)', summary: 'Tạo endpoint truyền thông; trả fd. AF_INET/UNIX, SOCK_STREAM/DGRAM.' },
  bind:   { signature: 'int bind(int sockfd, const struct sockaddr *addr, socklen_t alen)', summary: 'Gán địa chỉ (IP:port hoặc path UDS) vào socket.' },
  listen: { signature: 'int listen(int sockfd, int backlog)', summary: 'Đặt socket TCP vào trạng thái LISTEN, accept queue = backlog.' },
  accept: { signature: 'int accept(int sockfd, struct sockaddr *addr, socklen_t *alen)', summary: 'Lấy 1 connection từ accept queue, trả fd mới.' },
  connect:{ signature: 'int connect(int sockfd, const struct sockaddr *addr, socklen_t alen)', summary: 'Khởi tạo TCP three-way handshake hoặc nối UDS.' },
  socketpair: { signature: 'int socketpair(int domain, int type, int protocol, int sv[2])', summary: 'Tạo cặp socket nối nhau (thường AF_UNIX) cho IPC parent↔child.' },
  init_module:   { signature: 'int init_module(...)', summary: 'Syscall thực sự được gọi bởi insmod/modprobe để load module.' },
  delete_module: { signature: 'int delete_module(const char *name, unsigned int flags)', summary: 'Syscall được rmmod gọi để unload module.' },
};

export const CONCEPTS = {
  /* ─── Files / Permissions ───────────────────────── */
  chmod: {
    summary: 'Đổi permission bits (rwx cho owner/group/others) qua syscall chmod()/fchmod().',
    command: 'chmod 755 file.sh',
    breakdown: [
      { token: 'chmod',    meaning: 'change mode' },
      { token: '755',      meaning: 'octal: owner=7(rwx), group=5(rx), others=5(rx)' },
      { token: 'file.sh',  meaning: 'target path' },
    ],
    syscalls: ['open'],
    concepts: ['VFS', 'inode'],
    flow: [
      'userspace: chmod()                          ',
      '   → glibc wrapper                          ',
      '      → syscall #SYS_chmod                  ',
      '         → kernel: vfs_setattr()            ',
      '            → filesystem driver (ext4/btrfs)',
      '               → ghi inode mới             ',
    ],
    risks: 'chmod 777 /etc → mở quyền cho mọi user, rủi ro cực lớn.',
  },
  chown: {
    summary: 'Đổi owner và/hoặc group của file.',
    command: 'chown user:group file',
    syscalls: ['open'],
    concepts: ['VFS', 'inode', 'UID/GID'],
  },
  cron: {
    summary: 'cron daemon đọc crontab và thực thi job đúng lịch. mỗi user có 1 crontab riêng.',
    command: '*/5 * * * * /home/user/backup.sh',
    breakdown: [
      { token: '*/5', meaning: 'mỗi 5 phút' },
      { token: '*',   meaning: 'every hour'  },
      { token: '*',   meaning: 'every day-of-month' },
      { token: '*',   meaning: 'every month' },
      { token: '*',   meaning: 'every day-of-week'  },
      { token: 'cmd', meaning: 'command to run' },
    ],
    concepts: ['systemd', 'fork+exec'],
  },
  apt: {
    summary: 'apt = front-end cho dpkg, thao tác với /var/lib/dpkg và /var/cache/apt/archives.',
    command: 'sudo apt install nginx',
    concepts: ['dpkg', 'package db', 'fork+exec'],
    risks: 'apt thao tác /etc, /var → đòi sudo. Nếu mirror compromised → toàn hệ thống bị ảnh hưởng.',
  },

  /* ─── Process ───────────────────────── */
  fork: {
    summary: 'Tạo process con. Sau fork(), child là bản sao COW của parent address space.',
    syscalls: ['fork', 'execve', 'waitpid'],
    concepts: ['Copy-On-Write', 'task_struct'],
    flow: [
      'userspace gọi fork()',
      '→ syscall sys_clone (Linux thực ra dùng clone)',
      '→ kernel cấp task_struct mới',
      '→ kernel chia sẻ page table (COW)',
      '→ scheduler đánh dấu RUNNABLE',
      '→ trả 0 về child, pid về parent',
    ],
  },
  zombie: {
    summary: 'Child đã exit nhưng parent chưa gọi wait() → entry trong task table còn giữ exit code, state = Z (defunct).',
    syscalls: ['fork', 'exit', 'wait'],
    concepts: ['SIGCHLD', 'process accounting'],
    risks: 'Quá nhiều zombie → cạn PID, parent phải gọi wait() hoặc đặt SIGCHLD=SIG_IGN.',
  },
  orphan: {
    summary: 'Parent exit trước child → kernel reparent child về PID 1 (init/systemd) để vẫn có ai reap khi child exit.',
    syscalls: ['fork', 'exit'],
    concepts: ['init/systemd', 'PPID'],
  },

  /* ─── Network ───────────────────────── */
  socket: {
    summary: 'Socket = endpoint truyền thông. file descriptor có file_operations đặc biệt.',
    syscalls: ['socket', 'bind', 'listen', 'accept', 'connect'],
    concepts: ['VFS', 'TCP/IP stack'],
    flow: [
      'socket()  → kernel cấp struct socket + fd',
      'bind()    → gán địa chỉ',
      'listen()  → tạo accept queue',
      'accept()  → lấy connection ra → fd mới',
      'read/write → truyền dữ liệu qua TCP stack',
    ],
  },
  ping: {
    summary: 'Gửi ICMP ECHO_REQUEST, đo RTT.',
    command: 'ping -c 4 8.8.8.8',
    breakdown: [
      { token: 'ping', meaning: 'binary có capability cap_net_raw' },
      { token: '-c 4', meaning: 'gửi đúng 4 packet' },
      { token: '8.8.8.8', meaning: 'destination IP' },
    ],
    concepts: ['ICMP', 'raw socket'],
  },

  /* ─── Kernel module ───────────────────────── */
  insmod: {
    summary: 'Load .ko vào kernel. Gọi syscall init_module() → chạy module_init() handler.',
    command: 'sudo insmod hello_module.ko',
    syscalls: ['init_module'],
    concepts: ['LKM', 'kallsyms', 'printk'],
    risks: 'Code chạy trong ring 0 — bug = panic. Phải MODULE_LICENSE("GPL") để dùng GPL-only symbols.',
  },
  rmmod: {
    summary: 'Unload module. Kernel kiểm tra refcount = 0 trước khi gọi module_exit().',
    command: 'sudo rmmod hello_module',
    syscalls: ['delete_module'],
    concepts: ['LKM', 'refcount'],
  },
  printk: {
    summary: 'Ghi log từ kernel space ra ring buffer (xem qua dmesg). Có log levels (KERN_INFO, KERN_ERR…).',
    concepts: ['ring buffer', 'klogd', 'dmesg'],
  },
  procfs: {
    summary: '/proc là pseudo filesystem do kernel xuất ra runtime info. Không nằm trên đĩa.',
    syscalls: ['open', 'read', 'write'],
    concepts: ['VFS', 'seq_file', 'kobject'],
    flow: [
      'cat /proc/dashboard',
      '→ open()/read() → VFS',
      '→ proc filesystem dispatch',
      '→ proc_ops.proc_read = seq_read',
      '→ gọi show() callback → seq_printf() vào buffer',
      '→ copy_to_user() đến userspace',
    ],
  },
  sysfs: {
    summary: '/sys map mỗi kobject thành 1 thư mục, mỗi attribute thành 1 file. Khác /proc ở tính có cấu trúc.',
    concepts: ['kobject', 'driver model'],
  },
  chardev: {
    summary: 'Character device = file đặc biệt trong /dev gắn với 1 driver qua major/minor number.',
    command: 'echo hi > /dev/dashboard',
    syscalls: ['open', 'read', 'write', 'close'],
    concepts: ['cdev', 'file_operations', 'mknod'],
    flow: [
      'echo hi > /dev/dashboard',
      '→ shell open(/dev/dashboard) ',
      '→ VFS lookup major number',
      '→ kernel gọi driver->open()',
      '→ write() → driver->write()',
      '→ copy_from_user() vào ring buffer driver',
    ],
  },
  netfilter: {
    summary: 'Framework hook trong network stack: PRE_ROUTING, LOCAL_IN, FORWARD, LOCAL_OUT, POST_ROUTING.',
    concepts: ['hook', 'sk_buff'],
  },
  tracepoint: {
    summary: 'Static probe được nhúng sẵn trong kernel; module có thể đăng ký callback mà không cần patch.',
    concepts: ['ftrace', 'perf'],
  },
};

/* Convenience: build entry list cho UI search */
export function listConceptKeys() {
  return Object.keys(CONCEPTS).sort();
}
