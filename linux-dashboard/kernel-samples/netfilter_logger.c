/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  netfilter_logger.c — Inbound packet logger via Netfilter   ║
 * ║  Demonstrates: nf_register_net_hook, NF_INET_PRE_ROUTING    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Build:   make netfilter_logger.ko
 * Load:    sudo insmod netfilter_logger.ko
 * Watch:   sudo dmesg -w | grep nf_logger
 * Unload:  sudo rmmod netfilter_logger
 *
 * Module này chỉ LOG, KHÔNG drop packet — an toàn để demo.
 * Sample rate cho phép giảm spam dmesg.
 */

#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/init.h>
#include <linux/skbuff.h>
#include <linux/ip.h>
#include <linux/tcp.h>
#include <linux/udp.h>
#include <linux/netfilter.h>
#include <linux/netfilter_ipv4.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Linux Dashboard");
MODULE_DESCRIPTION("Inbound packet logger using Netfilter PRE_ROUTING hook");
MODULE_VERSION("1.0");

static unsigned int sample_rate = 64;
module_param(sample_rate, uint, 0644);
MODULE_PARM_DESC(sample_rate, "Log 1 packet every N (default 64). Set 1 to log all.");

static atomic_t pkt_count = ATOMIC_INIT(0);
static struct nf_hook_ops nfho;

static unsigned int hook_func(void *priv,
                              struct sk_buff *skb,
                              const struct nf_hook_state *state)
{
    struct iphdr *iph;
    unsigned int n;

    if (!skb)
        return NF_ACCEPT;

    iph = ip_hdr(skb);
    if (!iph)
        return NF_ACCEPT;

    n = atomic_inc_return(&pkt_count);
    if (sample_rate == 0 || (n % sample_rate) != 0)
        return NF_ACCEPT;

    if (iph->protocol == IPPROTO_TCP) {
        struct tcphdr *tcph = tcp_hdr(skb);
        printk(KERN_INFO "nf_logger: [TCP] %pI4:%u -> %pI4:%u  flags=0x%x  pkt#%u\n",
               &iph->saddr, ntohs(tcph->source),
               &iph->daddr, ntohs(tcph->dest),
               ((unsigned char *)tcph)[13], n);
    } else if (iph->protocol == IPPROTO_UDP) {
        struct udphdr *udph = udp_hdr(skb);
        printk(KERN_INFO "nf_logger: [UDP] %pI4:%u -> %pI4:%u  pkt#%u\n",
               &iph->saddr, ntohs(udph->source),
               &iph->daddr, ntohs(udph->dest), n);
    } else if (iph->protocol == IPPROTO_ICMP) {
        printk(KERN_INFO "nf_logger: [ICMP] %pI4 -> %pI4  pkt#%u\n",
               &iph->saddr, &iph->daddr, n);
    }

    return NF_ACCEPT;   /* never drop */
}

static int __init nf_logger_init(void)
{
    nfho.hook     = hook_func;
    nfho.hooknum  = NF_INET_PRE_ROUTING;
    nfho.pf       = PF_INET;
    nfho.priority = NF_IP_PRI_FIRST;

    nf_register_net_hook(&init_net, &nfho);
    printk(KERN_INFO "nf_logger: registered (sample_rate=%u)\n", sample_rate);
    return 0;
}

static void __exit nf_logger_exit(void)
{
    nf_unregister_net_hook(&init_net, &nfho);
    printk(KERN_INFO "nf_logger: unregistered, total seen=%d\n",
           atomic_read(&pkt_count));
}

module_init(nf_logger_init);
module_exit(nf_logger_exit);
