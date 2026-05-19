/*
 * tcp_echo_server.c — single-threaded TCP echo server.
 *
 *  Build: gcc -O2 -Wall -o tcp_echo_server tcp_echo_server.c
 *  Run  : ./tcp_echo_server [port=9999]
 *
 *  Concept:
 *   socket() → bind() → listen() → accept() loop → read/write → close()
 *   Phục vụ tuần tự một client tại một thời điểm (đủ cho demo).
 *   Tự động shutdown sau 60s không có kết nối mới (tránh treo).
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>
#include <errno.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <sys/select.h>

static volatile int stop = 0;
static void on_sig(int s) { (void)s; stop = 1; }

int main(int argc, char **argv)
{
    int port = (argc > 1) ? atoi(argv[1]) : 9999;
    signal(SIGINT, on_sig);
    signal(SIGTERM, on_sig);

    int srv = socket(AF_INET, SOCK_STREAM, 0);
    if (srv < 0) { perror("socket"); return 1; }

    int yes = 1;
    setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &yes, sizeof yes);

    struct sockaddr_in addr = { .sin_family = AF_INET,
                                .sin_addr.s_addr = htonl(INADDR_ANY),
                                .sin_port = htons(port) };
    if (bind(srv, (struct sockaddr *)&addr, sizeof addr) < 0) {
        perror("bind"); close(srv); return 1;
    }
    if (listen(srv, 8) < 0) { perror("listen"); close(srv); return 1; }

    printf("[server] listening on 0.0.0.0:%d (Ctrl+C to stop)\n", port);

    while (!stop) {
        fd_set rfds; FD_ZERO(&rfds); FD_SET(srv, &rfds);
        struct timeval tv = { .tv_sec = 60, .tv_usec = 0 };
        int r = select(srv + 1, &rfds, NULL, NULL, &tv);
        if (r == 0) { printf("[server] idle 60s, shutting down\n"); break; }
        if (r < 0) { if (errno == EINTR) continue; perror("select"); break; }

        struct sockaddr_in cli; socklen_t cl = sizeof cli;
        int fd = accept(srv, (struct sockaddr *)&cli, &cl);
        if (fd < 0) { if (stop) break; perror("accept"); continue; }

        char ip[64]; inet_ntop(AF_INET, &cli.sin_addr, ip, sizeof ip);
        printf("[server] connect from %s:%u\n", ip, ntohs(cli.sin_port));

        char buf[1024];
        ssize_t n;
        while ((n = read(fd, buf, sizeof buf)) > 0) {
            if (write(fd, buf, n) != n) break;
        }
        printf("[server] disconnect %s:%u\n", ip, ntohs(cli.sin_port));
        close(fd);
    }
    close(srv);
    printf("[server] stopped\n");
    return 0;
}
