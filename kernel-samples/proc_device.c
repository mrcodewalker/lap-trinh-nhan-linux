#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>

#define DEVICE_NAME "antigravity_dev"
#define PROC_NAME "antigravity_status"
#define BUF_SIZE 1024

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Antigravity AI");
MODULE_DESCRIPTION("Advanced Character Device and Proc File Mapping Module");
MODULE_VERSION("2.0");

static int major;
static char device_buffer[BUF_SIZE];
static int open_count = 0;

// ============ CHARACTER DEVICE LOGIC ============

static int dev_open(struct inode *inodep, struct file *filep) {
    open_count++;
    printk(KERN_INFO "AntigravityDev: Device opened %d times\n", open_count);
    return 0;
}

static ssize_t dev_read(struct file *filep, char *buffer, size_t len, loff_t *offset) {
    int bytes_read = 0;
    const char *msg = "Greetings from Antigravity Kernel Module!\n";
    int msg_len = strlen(msg);

    if (*offset >= msg_len) return 0;
    if (len > msg_len - *offset) len = msg_len - *offset;

    if (copy_to_user(buffer, msg + *offset, len)) return -EFAULT;

    *offset += len;
    bytes_read = len;
    return bytes_read;
}

static struct file_operations fops = {
    .open = dev_open,
    .read = dev_read,
};

// ============ PROC FILE LOGIC ============

static int status_show(struct seq_file *m, void *v) {
    seq_printf(m, "--- Antigravity Module Status ---\n");
    seq_printf(m, "Device Name: %s\n", DEVICE_NAME);
    seq_printf(m, "Major ID:    %d\n", major);
    seq_printf(m, "Open Count:  %d\n", open_count);
    seq_printf(m, "Kernel Ver:  %s\n", UTS_RELEASE);
    return 0;
}

static int status_open(struct inode *inode, struct file *file) {
    return single_open(file, status_show, NULL);
}

static const struct proc_ops status_fops = {
    .proc_open = status_open,
    .proc_read = seq_read,
    .proc_lseek = seq_lseek,
    .proc_release = single_release,
};

// ============ MODULE INIT / EXIT ============

static int __init antigravity_init(void) {
    // 1. Register Character Device
    major = register_chrdev(0, DEVICE_NAME, &fops);
    if (major < 0) {
        printk(KERN_ALERT "AntigravityDev: Failed to register major number\n");
        return major;
    }
    printk(KERN_INFO "AntigravityDev: Registered with Major ID %d\n", major);
    printk(KERN_INFO "AntigravityDev: Create device file with: mknod /dev/%s c %d 0\n", DEVICE_NAME, major);

    // 2. Create Proc Entry
    if (!proc_create(PROC_NAME, 0, NULL, &status_fops)) {
        unregister_chrdev(major, DEVICE_NAME);
        return -ENOMEM;
    }
    printk(KERN_INFO "AntigravityDev: Proc entry /proc/%s created\n", PROC_NAME);

    return 0;
}

static void __exit antigravity_exit(void) {
    remove_proc_entry(PROC_NAME, NULL);
    unregister_chrdev(major, DEVICE_NAME);
    printk(KERN_INFO "AntigravityDev: Module unloaded\n");
}

module_init(antigravity_init);
module_exit(antigravity_exit);
