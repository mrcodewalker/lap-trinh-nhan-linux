/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  timer_module.c — Kernel Timer & Workqueue Demo             ║
 * ║  Demonstrates: timer_list, workqueue, jiffies, ktime        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Build:   make
 * Load:    sudo insmod timer_module.ko interval_ms=2000
 * Watch:   sudo dmesg -w | grep timer_module
 * Unload:  sudo rmmod timer_module
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/timer.h>
#include <linux/jiffies.h>
#include <linux/workqueue.h>
#include <linux/ktime.h>
#include <linux/sched.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Kernel timer and workqueue demonstration");
MODULE_VERSION("2.0");

/* Module parameters */
static unsigned long interval_ms = 3000;
module_param(interval_ms, ulong, 0444);
MODULE_PARM_DESC(interval_ms, "Timer interval in milliseconds (default: 3000)");

static int max_ticks = 10;
module_param(max_ticks, int, 0444);
MODULE_PARM_DESC(max_ticks, "Maximum number of ticks before auto-stop (default: 10)");

/* State */
static struct timer_list   my_timer;
static struct workqueue_struct *my_wq;
static struct work_struct   my_work;
static atomic_t tick_count = ATOMIC_INIT(0);
static ktime_t  start_time;

/* ── Work handler (runs in process context) ── */
static void work_handler(struct work_struct *work)
{
    int tick = atomic_read(&tick_count);
    ktime_t elapsed = ktime_sub(ktime_get(), start_time);
    s64 ms = ktime_to_ms(elapsed);

    printk(KERN_INFO "timer_module: [work] tick=%d elapsed=%lldms jiffies=%lu\n",
           tick, ms, jiffies);
}

/* ── Timer callback (runs in softirq context — keep it short!) ── */
static void timer_callback(struct timer_list *t)
{
    int tick = atomic_inc_return(&tick_count);

    /* Offload heavy work to workqueue */
    queue_work(my_wq, &my_work);

    if (tick >= max_ticks) {
        printk(KERN_INFO "timer_module: reached max_ticks=%d, stopping\n", max_ticks);
        return;   /* Don't re-arm */
    }

    /* Re-arm the timer */
    mod_timer(&my_timer, jiffies + msecs_to_jiffies(interval_ms));
}

static int __init timer_init(void)
{
    start_time = ktime_get();

    /* Create a single-threaded workqueue */
    my_wq = create_singlethread_workqueue("dashboard_wq");
    if (!my_wq)
        return -ENOMEM;

    INIT_WORK(&my_work, work_handler);

    /* Set up and arm the timer */
    timer_setup(&my_timer, timer_callback, 0);
    mod_timer(&my_timer, jiffies + msecs_to_jiffies(interval_ms));

    printk(KERN_INFO "timer_module: started — interval=%lums max_ticks=%d\n",
           interval_ms, max_ticks);
    printk(KERN_INFO "timer_module: watch with: sudo dmesg -w | grep timer_module\n");
    return 0;
}

static void __exit timer_exit(void)
{
    del_timer_sync(&my_timer);
    flush_workqueue(my_wq);
    destroy_workqueue(my_wq);
    printk(KERN_INFO "timer_module: stopped after %d ticks\n",
           atomic_read(&tick_count));
}

module_init(timer_init);
module_exit(timer_exit);
