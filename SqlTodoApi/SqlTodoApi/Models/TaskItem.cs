using System.ComponentModel.DataAnnotations;

namespace SqlTodoApi.Models
{
    public class TaskItem
    {
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } = "";

        public string? Description { get; set; }

        public string? Priority { get; set; }

        public bool IsDone { get; set; }

        public DateTime DueDate { get; set; } = DateTime.Now;
    }
}
