/**
 * Simple Hello World Kernel Module
 * Compile: make
 * Load: sudo insmod hello.ko
 * Unload: sudo rmmod hello
 * View output: dmesg | tail
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Simple Hello World Kernel Module");
MODULE_VERSION("1.0");

static int __init hello_init(void) {
    printk(KERN_INFO "╔════════════════════════════════════════╗\n");
    printk(KERN_INFO "║  Hello from Linux Kernel Module!       ║\n");
    printk(KERN_INFO "║  Linux Dashboard - System Programming  ║\n");
    printk(KERN_INFO "╚════════════════════════════════════════╝\n");
    return 0;
}

static void __exit hello_exit(void) {
    printk(KERN_INFO "Goodbye from kernel module!\n");
}

module_init(hello_init);
module_exit(hello_exit);
