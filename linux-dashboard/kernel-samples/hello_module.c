/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  hello_module.c — Linux Dashboard Kernel Module Sample      ║
 * ║  Demonstrates: module init/exit, printk, module metadata    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Build:   make
 * Load:    sudo insmod hello_module.ko
 * Verify:  dmesg | tail -5
 * Unload:  sudo rmmod hello_module
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard <linux-dashboard@example.com>");
MODULE_DESCRIPTION("Hello World — introductory kernel module");
MODULE_VERSION("2.0");

/* Module parameter: customise the greeting at load time
 * Usage: sudo insmod hello_module.ko greeting="Xin chao" */
static char *greeting = "Hello";
module_param(greeting, charp, 0444);
MODULE_PARM_DESC(greeting, "Greeting string (default: Hello)");

static int __init hello_init(void)
{
    printk(KERN_INFO "hello_module: ==========================================\n");
    printk(KERN_INFO "hello_module: %s from Linux Dashboard Kernel Module!\n", greeting);
    printk(KERN_INFO "hello_module: Kernel %s | PID %d\n",
           utsname()->release, task_pid_nr(current));
    printk(KERN_INFO "hello_module: ==========================================\n");
    return 0;   /* 0 = success, negative = error */
}

static void __exit hello_exit(void)
{
    printk(KERN_INFO "hello_module: module unloaded — goodbye!\n");
}

module_init(hello_init);
module_exit(hello_exit);
