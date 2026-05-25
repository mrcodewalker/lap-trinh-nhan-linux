/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  memory_monitor.c — Kernel memory snapshot via /proc        ║
 * ║  Demonstrates: si_meminfo, struct sysinfo, slab statistics  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Build:  make memory_monitor.ko
 * Load:   sudo insmod memory_monitor.ko
 * Read:   cat /proc/dashboard_mem
 * Unload: sudo rmmod memory_monitor
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/proc_fs.h>
#include <linux/seq_file.h>
#include <linux/mm.h>
#include <linux/swap.h>
#include <linux/vmstat.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Memory monitor — snapshot of kernel memory state");
MODULE_VERSION("1.0");

#define PROC_NAME "dashboard_mem"

static int proc_show(struct seq_file *m, void *v)
{
    struct sysinfo si;
    si_meminfo(&si);

    seq_printf(m, "=== Linux Dashboard — Memory Snapshot ===\n");
    seq_printf(m, "Total RAM        : %lu pages (%lu MB)\n",
               si.totalram, (si.totalram * (PAGE_SIZE >> 10)) >> 10);
    seq_printf(m, "Free  RAM        : %lu pages (%lu MB)\n",
               si.freeram,  (si.freeram  * (PAGE_SIZE >> 10)) >> 10);
    seq_printf(m, "Shared RAM       : %lu pages\n", si.sharedram);
    seq_printf(m, "Buffer RAM       : %lu pages\n", si.bufferram);
    seq_printf(m, "Total Swap       : %lu pages\n", si.totalswap);
    seq_printf(m, "Free  Swap       : %lu pages\n", si.freeswap);
    seq_printf(m, "Page size        : %lu bytes\n", PAGE_SIZE);
    seq_printf(m, "Procs running    : %u\n", si.procs);

    seq_printf(m, "\n=== VM Stats ===\n");
    seq_printf(m, "NR_FILE_PAGES    : %ld\n", global_node_page_state(NR_FILE_PAGES));
    seq_printf(m, "NR_ANON_MAPPED   : %ld\n", global_node_page_state(NR_ANON_MAPPED));
    seq_printf(m, "NR_SLAB_RECLAIM  : %ld\n", global_node_page_state(NR_SLAB_RECLAIMABLE_B));
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

static int __init mm_init_mod(void)
{
    if (!proc_create(PROC_NAME, 0444, NULL, &proc_fops))
        return -ENOMEM;
    printk(KERN_INFO "memory_monitor: loaded — cat /proc/%s\n", PROC_NAME);
    return 0;
}

static void __exit mm_exit_mod(void)
{
    remove_proc_entry(PROC_NAME, NULL);
    printk(KERN_INFO "memory_monitor: unloaded\n");
}

module_init(mm_init_mod);
module_exit(mm_exit_mod);
