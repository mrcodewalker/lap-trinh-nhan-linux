/*
 * fork_demo.c — fork() + exec() + wait() pipeline minh hoạ.
 *
 *  Build: gcc -O2 -Wall -o fork_demo fork_demo.c
 *  Run  : ./fork_demo [n=3]
 *
 *  Concept:
 *   - parent fork N child.
 *   - mỗi child execvp("/bin/echo", ...) → đọc address space mới.
 *   - parent waitpid() để collect exit code → tránh zombie.
 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>
#include <string.h>

int main(int argc, char **argv)
{
    int n = (argc > 1) ? atoi(argv[1]) : 3;
    if (n < 1) n = 1;
    if (n > 10) n = 10;

    printf("[parent pid=%d] forking %d children\n", getpid(), n);

    for (int i = 0; i < n; i++) {
        pid_t p = fork();
        if (p < 0) { perror("fork"); return 1; }
        if (p == 0) {
            char idx[16]; snprintf(idx, sizeof idx, "child#%d", i);
            char *args[] = { "/bin/echo", "hello-from", idx, NULL };
            execvp(args[0], args);
            perror("execvp"); _exit(127);
        }
    }

    int alive = n, exited = 0;
    while (alive > 0) {
        int status;
        pid_t r = waitpid(-1, &status, 0);
        if (r < 0) break;
        alive--; exited++;
        printf("[parent] reaped %d (exit=%d)\n",
               r, WIFEXITED(status) ? WEXITSTATUS(status) : -1);
    }
    printf("[parent] all %d children reaped\n", exited);
    return 0;
}
