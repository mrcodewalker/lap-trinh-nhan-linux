/*
 * uds_demo.c — UNIX domain socket pair demo (parent ↔ child IPC).
 *
 *  Build: gcc -O2 -Wall -o uds_demo uds_demo.c
 *  Run  : ./uds_demo
 *
 *  Concept:
 *   socketpair(AF_UNIX, SOCK_STREAM, 0, sv)
 *   → trả về 2 fd nối với nhau, dùng cho parent/child IPC sau fork().
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/wait.h>

int main(void)
{
    int sv[2];
    if (socketpair(AF_UNIX, SOCK_STREAM, 0, sv) < 0) {
        perror("socketpair"); return 1;
    }

    pid_t p = fork();
    if (p < 0) { perror("fork"); return 1; }

    if (p == 0) {                                       /* child */
        close(sv[0]);
        const char *m = "ping-from-child";
        write(sv[1], m, strlen(m));
        char buf[64] = {0};
        ssize_t n = read(sv[1], buf, sizeof buf - 1);
        if (n > 0) printf("[child ] got: %s\n", buf);
        close(sv[1]);
        _exit(0);
    }

    /* parent */
    close(sv[1]);
    char buf[64] = {0};
    ssize_t n = read(sv[0], buf, sizeof buf - 1);
    if (n > 0) {
        printf("[parent] got: %s\n", buf);
        const char *r = "pong-from-parent";
        write(sv[0], r, strlen(r));
    }
    close(sv[0]);
    waitpid(p, NULL, 0);
    return 0;
}
