/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  chardev_module.c — Character Device Driver                 ║
 * ║  Demonstrates: cdev, file_operations, copy_to/from_user     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Build:   make
 * Load:    sudo insmod chardev_module.ko
 * Setup:   sudo mknod /dev/dashboard c <major> 0
 *          sudo chmod 666 /dev/dashboard
 * Write:   echo "hello kernel" > /dev/dashboard
 * Read:    cat /dev/dashboard
 * Unload:  sudo rmmod chardev_module
 *          sudo rm /dev/dashboard
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/fs.h>
#include <linux/uaccess.h>
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/slab.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Character device driver — bidirectional I/O");
MODULE_VERSION("2.0");

#define DEVICE_NAME "dashboard"
#define CLASS_NAME  "dashboard_class"
#define BUF_SIZE    4096

static int          major_num;
static struct class  *dev_class;
static struct device *dev_device;
static struct cdev   my_cdev;
static char         *ring_buf;
static int           buf_head = 0;   /* write position */
static int           buf_tail = 0;   /* read position  */
static int           buf_count = 0;

/* ── open ── */
static int dev_open(struct inode *inode, struct file *file)
{
    printk(KERN_INFO "chardev: opened by PID %d (%s)\n",
           task_pid_nr(current), current->comm);
    return 0;
}

/* ── release ── */
static int dev_release(struct inode *inode, struct file *file)
{
    printk(KERN_INFO "chardev: closed by PID %d\n", task_pid_nr(current));
    return 0;
}

/* ── read: userspace reads from device ── */
static ssize_t dev_read(struct file *file, char __user *ubuf,
                         size_t len, loff_t *offset)
{
    int bytes_read = 0;

    if (buf_count == 0)
        return 0;   /* EOF */

    while (len > 0 && buf_count > 0) {
        if (put_user(ring_buf[buf_tail], ubuf++))
            return -EFAULT;
        buf_tail = (buf_tail + 1) % BUF_SIZE;
        buf_count--;
        bytes_read++;
        len--;
    }

    printk(KERN_INFO "chardev: sent %d bytes to userspace\n", bytes_read);
    return bytes_read;
}

/* ── write: userspace writes to device ── */
static ssize_t dev_write(struct file *file, const char __user *ubuf,
                          size_t len, loff_t *offset)
{
    int bytes_written = 0;

    while (len > 0 && buf_count < BUF_SIZE) {
        if (get_user(ring_buf[buf_head], ubuf++))
            return -EFAULT;
        buf_head = (buf_head + 1) % BUF_SIZE;
        buf_count++;
        bytes_written++;
        len--;
    }

    printk(KERN_INFO "chardev: received %d bytes from userspace\n", bytes_written);
    return bytes_written;
}

static struct file_operations fops = {
    .owner   = THIS_MODULE,
    .open    = dev_open,
    .release = dev_release,
    .read    = dev_read,
    .write   = dev_write,
};

static int __init chardev_init(void)
{
    dev_t dev_num;

    /* Allocate ring buffer */
    ring_buf = kmalloc(BUF_SIZE, GFP_KERNEL);
    if (!ring_buf)
        return -ENOMEM;

    /* Allocate major number dynamically */
    if (alloc_chrdev_region(&dev_num, 0, 1, DEVICE_NAME) < 0) {
        kfree(ring_buf);
        return -1;
    }
    major_num = MAJOR(dev_num);

    /* Create device class */
    dev_class = class_create(THIS_MODULE, CLASS_NAME);
    if (IS_ERR(dev_class)) {
        unregister_chrdev_region(dev_num, 1);
        kfree(ring_buf);
        return PTR_ERR(dev_class);
    }

    /* Create device node /dev/dashboard automatically */
    dev_device = device_create(dev_class, NULL, dev_num, NULL, DEVICE_NAME);
    if (IS_ERR(dev_device)) {
        class_destroy(dev_class);
        unregister_chrdev_region(dev_num, 1);
        kfree(ring_buf);
        return PTR_ERR(dev_device);
    }

    /* Register cdev */
    cdev_init(&my_cdev, &fops);
    cdev_add(&my_cdev, dev_num, 1);

    printk(KERN_INFO "chardev: registered — major=%d\n", major_num);
    printk(KERN_INFO "chardev: device node: /dev/%s\n", DEVICE_NAME);
    printk(KERN_INFO "chardev: test: echo hello > /dev/%s && cat /dev/%s\n",
           DEVICE_NAME, DEVICE_NAME);
    return 0;
}

static void __exit chardev_exit(void)
{
    dev_t dev_num = MKDEV(major_num, 0);
    cdev_del(&my_cdev);
    device_destroy(dev_class, dev_num);
    class_destroy(dev_class);
    unregister_chrdev_region(dev_num, 1);
    kfree(ring_buf);
    printk(KERN_INFO "chardev: unregistered\n");
}

module_init(chardev_init);
module_exit(chardev_exit);
