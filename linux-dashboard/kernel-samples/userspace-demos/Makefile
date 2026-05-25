# Userspace demos for Linux Dashboard
CC      ?= gcc
CFLAGS  ?= -O2 -Wall -Wextra -D_GNU_SOURCE

BINS = zombie_demo orphan_demo fork_demo \
       tcp_echo_server tcp_echo_client uds_demo

all: $(BINS)

%: %.c
	$(CC) $(CFLAGS) -o $@ $<

clean:
	rm -f $(BINS)

.PHONY: all clean
