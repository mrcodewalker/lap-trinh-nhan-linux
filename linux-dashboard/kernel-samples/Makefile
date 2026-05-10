# ╔══════════════════════════════════════════════════════════════╗
# ║  Linux Dashboard — Kernel Samples Makefile                  ║
# ╚══════════════════════════════════════════════════════════════╝

KDIR   := /lib/modules/$(shell uname -r)/build
PWD    := $(shell pwd)

# Build all modules
obj-m += hello_module.o
obj-m += proc_module.o
obj-m += chardev_module.o
obj-m += timer_module.o

# ── Targets ────────────────────────────────────────────────────

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean

# ── Individual module targets ───────────────────────────────────

hello:
	$(MAKE) -C $(KDIR) M=$(PWD) hello_module.ko

proc:
	$(MAKE) -C $(KDIR) M=$(PWD) proc_module.ko

chardev:
	$(MAKE) -C $(KDIR) M=$(PWD) chardev_module.ko

timer:
	$(MAKE) -C $(KDIR) M=$(PWD) timer_module.ko

# ── Load / unload helpers ───────────────────────────────────────

load-hello:
	sudo insmod hello_module.ko
	dmesg | tail -5

unload-hello:
	sudo rmmod hello_module
	dmesg | tail -3

load-proc:
	sudo insmod proc_module.ko
	cat /proc/dashboard

unload-proc:
	sudo rmmod proc_module

load-chardev:
	sudo insmod chardev_module.ko
	dmesg | tail -5

unload-chardev:
	sudo rmmod chardev_module

load-timer:
	sudo insmod timer_module.ko interval_ms=2000 max_ticks=5
	@echo "Watching dmesg for 12 seconds..."
	@sleep 12 && sudo rmmod timer_module

# ── Status ─────────────────────────────────────────────────────

status:
	@echo "=== Loaded dashboard modules ==="
	@lsmod | grep -E "hello_module|proc_module|chardev_module|timer_module" || echo "(none loaded)"
	@echo ""
	@echo "=== Recent kernel messages ==="
	@dmesg | grep -E "hello_module|proc_module|chardev|timer_module" | tail -10

.PHONY: all clean hello proc chardev timer \
        load-hello unload-hello load-proc unload-proc \
        load-chardev unload-chardev load-timer status
