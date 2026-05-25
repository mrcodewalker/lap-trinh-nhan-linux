/*
 * zombie_demo.c — tạo zombie process trong N giây
 *
 *  Build : gcc -O2 -Wall -o zombie_demo zombie_demo.c
 *  Run   : ./zombie_demo [seconds=10]
 *
 *  Concept:
 *   - fork() tạo child.
 *   - child exit(0) ngay.
 *   - parent KHÔNG gọi wait() trong N giây → child thành <defunct>.
 *   - Quan sát: ps -el | grep defunct   hoặc   ps -o pid,stat,comm $pid
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main(int argc, char **argv)
{
    int seconds = (argc > 1) ? atoi(argv[1]) : 10;
    pid_t pid = fork();

    if (pid < 0) { perror("fork"); return 1; }

    if (pid == 0) {
        printf("[child  pid=%d] exiting now → becomes <defunct>\n", getpid());
        _exit(0);
    }

    printf("[parent pid=%d] child=%d will be ZOMBIE for %ds\n",
           getpid(), pid, seconds);
    printf("  observe with:  ps -o pid,ppid,stat,comm %d\n", pid);
    sleep(seconds);

    /* Reap to clean up */
    waitpid(pid, NULL, 0);
    printf("[parent] reaped child %d → no more zombie\n", pid);
    return 0;
}
