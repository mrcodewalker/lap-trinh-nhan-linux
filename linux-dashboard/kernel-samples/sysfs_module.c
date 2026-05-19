/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  sysfs_module.c — /sys filesystem demo                      ║
 * ║  Demonstrates: kobject, sysfs_create_file, kobj_attribute   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Build:  make sysfs_module.ko
 * Load:   sudo insmod sysfs_module.ko
 * Read:   cat /sys/kernel/dashboard/counter
 * Write:  echo 42 | sudo tee /sys/kernel/dashboard/counter
 * Unload: sudo rmmod sysfs_module
 *
 * Sysfs khác /proc ở chỗ /sys là interface có cấu trúc, mỗi file
 * phơi đúng một thuộc tính của một kobject — phù hợp để xuất
 * config/state của driver.
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/kobject.h>
#include <linux/sysfs.h>
#include <linux/string.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Sysfs interface demo");
MODULE_VERSION("1.0");

static struct kobject *dashboard_kobj;
static int counter      = 0;
static char message[64] = "hello-from-kernel";

/* show: gọi khi userspace `cat` vào file */
static ssize_t counter_show(struct kobject *kobj, struct kobj_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "%d\n", counter);
}

/* store: gọi khi userspace `echo` vào file */
static ssize_t counter_store(struct kobject *kobj, struct kobj_attribute *attr,
                             const char *buf, size_t count)
{
    int val;
    if (kstrtoint(buf, 10, &val))
        return -EINVAL;
    counter = val;
    printk(KERN_INFO "sysfs_module: counter set to %d\n", counter);
    return count;
}

static ssize_t message_show(struct kobject *kobj, struct kobj_attribute *attr, char *buf)
{
    return sysfs_emit(buf, "%s\n", message);
}

static ssize_t message_store(struct kobject *kobj, struct kobj_attribute *attr,
                             const char *buf, size_t count)
{
    size_t n = min(count, sizeof(message) - 1);
    memcpy(message, buf, n);
    message[n] = '\0';
    /* trim trailing newline */
    if (n > 0 && message[n - 1] == '\n')
        message[n - 1] = '\0';
    printk(KERN_INFO "sysfs_module: message updated to '%s'\n", message);
    return count;
}

static struct kobj_attribute counter_attr = __ATTR(counter, 0664, counter_show, counter_store);
static struct kobj_attribute message_attr = __ATTR(message, 0664, message_show, message_store);

static struct attribute *attrs[] = {
    &counter_attr.attr,
    &message_attr.attr,
    NULL,
};

static struct attribute_group attr_group = { .attrs = attrs };

static int __init sysfs_demo_init(void)
{
    int retval;

    dashboard_kobj = kobject_create_and_add("dashboard", kernel_kobj);
    if (!dashboard_kobj)
        return -ENOMEM;

    retval = sysfs_create_group(dashboard_kobj, &attr_group);
    if (retval) {
        kobject_put(dashboard_kobj);
        return retval;
    }

    printk(KERN_INFO "sysfs_module: /sys/kernel/dashboard/{counter,message} created\n");
    return 0;
}

static void __exit sysfs_demo_exit(void)
{
    sysfs_remove_group(dashboard_kobj, &attr_group);
    kobject_put(dashboard_kobj);
    printk(KERN_INFO "sysfs_module: removed\n");
}

module_init(sysfs_demo_init);
module_exit(sysfs_demo_exit);
