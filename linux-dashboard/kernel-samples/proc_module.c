/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  proc_module.c — /proc Filesystem Interface                 ║
 * ║  Demonstrates: proc_fs, seq_file, read/write from userspace ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Build:   make
 * Load:    sudo insmod proc_module.ko
 * Read:    cat /proc/dashboard
 * Write:   echo "test" | sudo tee /proc/dashboard
 * Unload:  sudo rmmod proc_module
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/proc_fs.h>
#include <linux/uaccess.h>
#include <linux/seq_file.h>
#include <linux/sched.h>
#include <linux/mm.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Proc filesystem interface module");
MODULE_VERSION("2.0");

#define PROC_NAME   "dashboard"
#define BUF_SIZE    256

static char write_buf[BUF_SIZE] = "No message yet";
static int  write_len = 14;

/* ── seq_file show: called when user reads /proc/dashboard ── */
static int proc_show(struct seq_file *m, void *v)
{
    seq_printf(m, "=== Linux Dashboard Kernel Module ===\n");
    seq_printf(m, "Kernel release : %s\n", utsname()->release);
    seq_printf(m, "Kernel version : %s\n", utsname()->version);
    seq_printf(m, "Architecture   : %s\n", utsname()->machine);
    seq_printf(m, "Hostname       : %s\n", utsname()->nodename);
    seq_printf(m, "Last message   : %s\n", write_buf);
    return 0;
}

static int proc_open(struct inode *inode, struct file *file)
{
    return single_open(file, proc_show, NULL);
}

/* ── write handler: echo "msg" > /proc/dashboard ── */
static ssize_t proc_write(struct file *file, const char __user *ubuf,
                           size_t count, loff_t *ppos)
{
    int len = min((int)count, BUF_SIZE - 1);
    if (copy_from_user(write_buf, ubuf, len))
        return -EFAULT;
    write_buf[len] = '\0';
    write_len = len;
    printk(KERN_INFO "proc_module: received message: %s\n", write_buf);
    return count;
}

static const struct proc_ops proc_fops = {
    .proc_open    = proc_open,
    .proc_read    = seq_read,
    .proc_write   = proc_write,
    .proc_lseek   = seq_lseek,
    .proc_release = single_release,
};

static int __init proc_init(void)
{
    struct proc_dir_entry *entry;
    entry = proc_create(PROC_NAME, 0666, NULL, &proc_fops);
    if (!entry) {
        printk(KERN_ERR "proc_module: failed to create /proc/%s\n", PROC_NAME);
        return -ENOMEM;
    }
    printk(KERN_INFO "proc_module: /proc/%s created\n", PROC_NAME);
    printk(KERN_INFO "proc_module: try: cat /proc/%s\n", PROC_NAME);
    return 0;
}

static void __exit proc_exit(void)
{
    remove_proc_entry(PROC_NAME, NULL);
    printk(KERN_INFO "proc_module: /proc/%s removed\n", PROC_NAME);
}

module_init(proc_init);
module_exit(proc_exit);
