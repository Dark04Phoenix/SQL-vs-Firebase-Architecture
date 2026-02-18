using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace SqlTodoApi.Models
{
    public class TodoContext : DbContext
    {
        public TodoContext(DbContextOptions<TodoContext> options)
        : base(options) { }

        public DbSet<TaskItem> Tasks => Set<TaskItem>();
    }
}
