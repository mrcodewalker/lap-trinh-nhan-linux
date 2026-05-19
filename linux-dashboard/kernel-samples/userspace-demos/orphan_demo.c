/*
 * orphan_demo.c — tạo orphan process (cha mất, init/systemd nhận nuôi)
 *
 *  Build: gcc -O2 -Wall -o orphan_demo orphan_demo.c
 *  Run  : ./orphan_demo
 *
 *  Concept:
 *   - parent fork() → child.
 *   - parent exit() ngay khi child chưa chết.
 *   - child trở thành ORPHAN → kernel reparent về PID 1 (init/systemd).
 *   - Quan sát: ps -o pid,ppid,comm $child  (ppid sẽ là 1)
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(void)
{
    pid_t pid = fork();
    if (pid < 0) { perror("fork"); return 1; }

    if (pid == 0) {
        printf("[child  pid=%d ppid=%d] sleeping 8s...\n", getpid(), getppid());
        sleep(2);
        printf("[child  pid=%d ppid=%d] reparented after parent exited\n",
               getpid(), getppid());
        sleep(6);
        printf("[child  pid=%d] exiting clean.\n", getpid());
        return 0;
    }

    printf("[parent pid=%d] forked child=%d, parent exiting now\n",
           getpid(), pid);
    return 0;   /* parent dies; child becomes orphan */
}
