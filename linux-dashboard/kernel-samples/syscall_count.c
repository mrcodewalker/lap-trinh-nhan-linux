/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  syscall_count.c — Count syscalls via tracepoint            ║
 * ║  Demonstrates: tracepoint hook, sys_enter, /proc reporting  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Build:  make syscall_count.ko
 * Load:   sudo insmod syscall_count.ko
 * Read:   cat /proc/dashboard_syscalls
 * Unload: sudo rmmod syscall_count
 *
 * An toàn vì chỉ ĐẾM, không can thiệp luồng syscall.
 * Cần CONFIG_TRACEPOINTS=y (mọi distro Ubuntu chuẩn đều có).
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/tracepoint.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <trace/events/syscalls.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Count syscalls via sys_enter tracepoint");
MODULE_VERSION("1.0");

#define PROC_NAME      "dashboard_syscalls"
#define MAX_SYSCALL_NR 512

static atomic_long_t counters[MAX_SYSCALL_NR];
static struct tracepoint *tp_sys_enter;

static void probe_sys_enter(void *data, struct pt_regs *regs, long id)
{
    if (id >= 0 && id < MAX_SYSCALL_NR)
        atomic_long_inc(&counters[id]);
}

/* find tracepoint by name (no public registration helper for non-defined hooks) */
static void lookup_tp(struct tracepoint *tp, void *priv)
{
    if (!strcmp(tp->name, "sys_enter"))
        tp_sys_enter = tp;
}

static int proc_show(struct seq_file *m, void *v)
{
    int i, shown = 0;
    long total = 0;

    seq_printf(m, "=== Syscall counters (since module load) ===\n");
    seq_printf(m, "%-6s  %-12s\n", "NR", "COUNT");
    seq_printf(m, "------------------------\n");

    for (i = 0; i < MAX_SYSCALL_NR; i++) {
        long c = atomic_long_read(&counters[i]);
        total += c;
        if (c == 0)
            continue;
        seq_printf(m, "%-6d  %-12ld\n", i, c);
        shown++;
    }
    seq_printf(m, "------------------------\n");
    seq_printf(m, "Distinct syscalls : %d\n", shown);
    seq_printf(m, "Total invocations : %ld\n", total);
    return 0;
}

static int proc_open(struct inode *inode, struct file *file)
{
    return single_open(file, proc_show, NULL);
}

static const struct proc_ops proc_fops = {
    .proc_open    = proc_open,
    .proc_read    = seq_read,
    .proc_lseek   = seq_lseek,
    .proc_release = single_release,
};

static int __init sc_init(void)
{
    int i, ret;

    for (i = 0; i < MAX_SYSCALL_NR; i++)
        atomic_long_set(&counters[i], 0);

    for_each_kernel_tracepoint(lookup_tp, NULL);
    if (!tp_sys_enter) {
        printk(KERN_ERR "syscall_count: sys_enter tracepoint not found\n");
        return -ENODEV;
    }

    ret = tracepoint_probe_register(tp_sys_enter, probe_sys_enter, NULL);
    if (ret) {
        printk(KERN_ERR "syscall_count: failed to register probe (%d)\n", ret);
        return ret;
    }

    if (!proc_create(PROC_NAME, 0444, NULL, &proc_fops)) {
        tracepoint_probe_unregister(tp_sys_enter, probe_sys_enter, NULL);
        return -ENOMEM;
    }

    printk(KERN_INFO "syscall_count: loaded — cat /proc/%s\n", PROC_NAME);
    return 0;
}

static void __exit sc_exit(void)
{
    if (tp_sys_enter)
        tracepoint_probe_unregister(tp_sys_enter, probe_sys_enter, NULL);
    tracepoint_synchronize_unregister();
    remove_proc_entry(PROC_NAME, NULL);
    printk(KERN_INFO "syscall_count: unloaded\n");
}

module_init(sc_init);
module_exit(sc_exit);
