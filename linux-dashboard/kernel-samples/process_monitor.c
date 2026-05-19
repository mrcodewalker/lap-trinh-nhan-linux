/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  process_monitor.c — Process Monitor via /proc              ║
 * ║  Demonstrates: for_each_process, task_struct, seq_file      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Build:  make process_monitor.ko
 * Load:   sudo insmod process_monitor.ko
 * Read:   cat /proc/dashboard_procs
 * Unload: sudo rmmod process_monitor
 *
 * Concepts:
 *  - task_struct           : struct mô tả mỗi process trong kernel
 *  - for_each_process(p)   : macro duyệt toàn bộ task list
 *  - seq_file              : helper trả nội dung động qua /proc
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/sched.h>
#include <linux/sched/signal.h>   /* for_each_process */
#include <linux/mm.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Process monitor — list all running tasks via /proc");
MODULE_VERSION("1.0");

#define PROC_NAME "dashboard_procs"

static const char *task_state_str(unsigned int state)
{
    if (state == 0)            return "RUNNING";
    if (state & 0x0001)        return "INTERRUPTIBLE";
    if (state & 0x0002)        return "UNINTERRUPTIBLE";
    if (state & 0x0004)        return "STOPPED";
    if (state & 0x0008)        return "TRACED";
    return "OTHER";
}

static int proc_show(struct seq_file *m, void *v)
{
    struct task_struct *task;
    int total = 0;

    seq_printf(m, "%-7s %-7s %-16s %-16s %-10s %-10s\n",
               "PID", "PPID", "COMM", "STATE", "PRIO", "VSIZE_KB");
    seq_printf(m, "------------------------------------------------------------------------\n");

    rcu_read_lock();
    for_each_process(task) {
        unsigned long vsize_kb = 0;
        if (task->mm)
            vsize_kb = (task->mm->total_vm << (PAGE_SHIFT - 10));

        seq_printf(m, "%-7d %-7d %-16s %-16s %-10d %-10lu\n",
                   task_pid_nr(task),
                   task->real_parent ? task_pid_nr(task->real_parent) : 0,
                   task->comm,
                   task_state_str(task->__state),
                   task->prio,
                   vsize_kb);
        total++;
    }
    rcu_read_unlock();

    seq_printf(m, "\nTotal tasks: %d\n", total);
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

static int __init pm_init(void)
{
    if (!proc_create(PROC_NAME, 0444, NULL, &proc_fops)) {
        printk(KERN_ERR "process_monitor: failed to create /proc/%s\n", PROC_NAME);
        return -ENOMEM;
    }
    printk(KERN_INFO "process_monitor: loaded — try: cat /proc/%s\n", PROC_NAME);
    return 0;
}

static void __exit pm_exit(void)
{
    remove_proc_entry(PROC_NAME, NULL);
    printk(KERN_INFO "process_monitor: unloaded\n");
}

module_init(pm_init);
module_exit(pm_exit);
