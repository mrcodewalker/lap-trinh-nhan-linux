# ╔══════════════════════════════════════════════════════════════╗
# ║  Linux Dashboard — Kernel Samples Makefile                  ║
# ║  Build all .ko modules with: make                            ║
# ║  Clean with:                  make clean                     ║
# ╚══════════════════════════════════════════════════════════════╝

KDIR := /lib/modules/$(shell uname -r)/build
PWD  := $(shell pwd)

# All modules to build
obj-m += hello_module.o
obj-m += proc_module.o
obj-m += chardev_module.o
obj-m += timer_module.o
obj-m += process_monitor.o
obj-m += memory_monitor.o
obj-m += sysfs_module.o
obj-m += netfilter_logger.o
obj-m += syscall_count.o

# ── Targets ────────────────────────────────────────────────────

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean

# ── Per-module rebuild helpers ─────────────────────────────────
hello:           ; $(MAKE) -C $(KDIR) M=$(PWD) hello_module.ko
proc:            ; $(MAKE) -C $(KDIR) M=$(PWD) proc_module.ko
chardev:         ; $(MAKE) -C $(KDIR) M=$(PWD) chardev_module.ko
timer:           ; $(MAKE) -C $(KDIR) M=$(PWD) timer_module.ko
procmon:         ; $(MAKE) -C $(KDIR) M=$(PWD) process_monitor.ko
memmon:          ; $(MAKE) -C $(KDIR) M=$(PWD) memory_monitor.ko
sysfs:           ; $(MAKE) -C $(KDIR) M=$(PWD) sysfs_module.ko
netf:            ; $(MAKE) -C $(KDIR) M=$(PWD) netfilter_logger.ko
sccount:         ; $(MAKE) -C $(KDIR) M=$(PWD) syscall_count.ko

# ── Load / unload helpers ──────────────────────────────────────

load-hello:    ; sudo insmod hello_module.ko    && dmesg | tail -5
unload-hello:  ; sudo rmmod  hello_module       && dmesg | tail -3

load-proc:     ; sudo insmod proc_module.ko     && cat /proc/dashboard
unload-proc:   ; sudo rmmod  proc_module

load-chardev:  ; sudo insmod chardev_module.ko  && dmesg | tail -5
unload-chardev:; sudo rmmod  chardev_module

load-timer:
	sudo insmod timer_module.ko interval_ms=2000 max_ticks=5
	@echo "Watching dmesg for ~12s..."
	@sleep 12 && sudo rmmod timer_module

load-procmon:  ; sudo insmod process_monitor.ko && cat /proc/dashboard_procs | head
unload-procmon:; sudo rmmod  process_monitor

load-memmon:   ; sudo insmod memory_monitor.ko  && cat /proc/dashboard_mem
unload-memmon: ; sudo rmmod  memory_monitor

load-sysfs:
	sudo insmod sysfs_module.ko
	cat /sys/kernel/dashboard/counter
	cat /sys/kernel/dashboard/message
unload-sysfs:  ; sudo rmmod  sysfs_module

load-netf:     ; sudo insmod netfilter_logger.ko sample_rate=32 && dmesg | tail
unload-netf:   ; sudo rmmod  netfilter_logger

load-sccount:  ; sudo insmod syscall_count.ko   && cat /proc/dashboard_syscalls | head
unload-sccount:; sudo rmmod  syscall_count

# ── Status ─────────────────────────────────────────────────────

status:
	@echo "=== Loaded dashboard modules ==="
	@lsmod | grep -E "hello_module|proc_module|chardev_module|timer_module|process_monitor|memory_monitor|sysfs_module|netfilter_logger|syscall_count" || echo "(none loaded)"
	@echo ""
	@echo "=== Recent kernel messages ==="
	@dmesg | grep -E "hello_module|proc_module|chardev|timer_module|process_monitor|memory_monitor|sysfs_module|nf_logger|syscall_count" | tail -10

unload-all:
	-sudo rmmod syscall_count
	-sudo rmmod netfilter_logger
	-sudo rmmod sysfs_module
	-sudo rmmod memory_monitor
	-sudo rmmod process_monitor
	-sudo rmmod timer_module
	-sudo rmmod chardev_module
	-sudo rmmod proc_module
	-sudo rmmod hello_module

.PHONY: all clean status unload-all \
        hello proc chardev timer procmon memmon sysfs netf sccount \
        load-hello unload-hello load-proc unload-proc \
        load-chardev unload-chardev load-timer \
        load-procmon unload-procmon load-memmon unload-memmon \
        load-sysfs  unload-sysfs  load-netf    unload-netf \
        load-sccount unload-sccount
