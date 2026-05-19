/*
 * tcp_echo_client.c — kết nối tới tcp_echo_server, gửi message, nhận echo.
 *
 *  Build: gcc -O2 -Wall -o tcp_echo_client tcp_echo_client.c
 *  Run  : ./tcp_echo_client 127.0.0.1 9999 "hello"
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>

int main(int argc, char **argv)
{
    const char *host = argc > 1 ? argv[1] : "127.0.0.1";
    int port         = argc > 2 ? atoi(argv[2]) : 9999;
    const char *msg  = argc > 3 ? argv[3] : "hello-from-dashboard";

    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) { perror("socket"); return 1; }

    struct sockaddr_in srv = { .sin_family = AF_INET, .sin_port = htons(port) };
    if (inet_pton(AF_INET, host, &srv.sin_addr) <= 0) {
        fprintf(stderr, "bad host: %s\n", host); return 1;
    }

    if (connect(fd, (struct sockaddr*)&srv, sizeof srv) < 0) {
        perror("connect"); close(fd); return 1;
    }
    printf("[client] connected to %s:%d\n", host, port);

    if (write(fd, msg, strlen(msg)) < 0) { perror("write"); close(fd); return 1; }

    char buf[1024];
    ssize_t n = read(fd, buf, sizeof buf - 1);
    if (n > 0) {
        buf[n] = 0;
        printf("[client] received: %s\n", buf);
    }
    close(fd);
    return 0;
}
