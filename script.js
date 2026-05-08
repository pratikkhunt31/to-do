$(document).ready(function () {
  var tasks = getSavedTasks();
  var currentFilter = "all";
  var editingId = null;

  renderTasks();

  $("#taskForm").on("submit", function (event) {
    event.preventDefault();

    var title = $("#taskTitle").val().trim();

    if (title === "") {
      showToast("Please enter a task");
      return;
    }

    if (editingId) {
      var editingTask = tasks.find(function (task) {
        return task.id === editingId;
      });

      if (!editingTask || editingTask.completed) {
        editingId = null;
        clearForm();
        renderTasks();
        showToast("Completed tasks cannot be edited");
        return;
      }

      tasks = tasks.map(function (task) {
        if (task.id === editingId) {
          task.title = title;
          task.dueDate = $("#taskDate").val();
          task.priority = $("#taskPriority").val();
          task.category = $("#taskCategory").val();
        }

        return task;
      });

      editingId = null;
      showToast("Task updated");
    } else {
      var newTask = {
        id: Date.now(),
        title: title,
        dueDate: $("#taskDate").val(),
        priority: $("#taskPriority").val(),
        category: $("#taskCategory").val(),
        completed: false,
        important: false,
        createdAt: new Date().toISOString()
      };

      tasks.push(newTask);
      showToast("Task added");
    }

    saveTasks();
    clearForm();
    renderTasks();
  });

  $(".filter-btn").on("click", function () {
    $(".filter-btn").removeClass("active");
    $(this).addClass("active");
    currentFilter = $(this).data("filter");
    renderTasks();
  });

  $("#searchInput, #sortSelect").on("input change", function () {
    renderTasks();
  });

  $("#clearCompleted").on("click", function () {
    tasks = tasks.filter(function (task) {
      return task.completed === false;
    });

    saveTasks();
    renderTasks();
    showToast("Completed tasks cleared");
  });

  $("#taskList").on("change", ".task-check", function () {
    var id = Number($(this).closest(".task-item").data("id"));

    tasks = tasks.map(function (task) {
      if (task.id === id) {
        task.completed = !task.completed;
      }
      return task;
    });

    if (editingId === id) {
      editingId = null;
      clearForm();
    }

    saveTasks();
    renderTasks();
  });

  $("#taskList").on("click", ".important-btn", function () {
    var id = Number($(this).closest(".task-item").data("id"));

    tasks = tasks.map(function (task) {
      if (task.id === id) {
        task.important = !task.important;
      }
      return task;
    });

    saveTasks();
    renderTasks();
  });

  $("#taskList").on("click", ".delete-btn", function () {
    var id = Number($(this).closest(".task-item").data("id"));

    tasks = tasks.filter(function (task) {
      return task.id !== id;
    });

    saveTasks();
    renderTasks();
    showToast("Task deleted");
  });

  $("#taskList").on("click", ".edit-btn", function () {
    var id = Number($(this).closest(".task-item").data("id"));
    var taskToEdit = tasks.find(function (task) {
      return task.id === id;
    });

    if (!taskToEdit) {
      return;
    }

    if (taskToEdit.completed) {
      showToast("Completed tasks cannot be edited");
      return;
    }

    editingId = id;
    $("#taskTitle").val(taskToEdit.title).focus();
    $("#taskDate").val(taskToEdit.dueDate);
    $("#taskPriority").val(taskToEdit.priority);
    $("#taskCategory").val(taskToEdit.category);
    $(".add-btn").text("Update Task");
    showToast("Editing task");
  });

  function getSavedTasks() {
    var savedTasks = localStorage.getItem("taskflow_tasks");

    if (savedTasks) {
      return JSON.parse(savedTasks);
    }

    return [
      {
        id: 1,
        title: "Review project milestones",
        dueDate: getToday(),
        priority: "high",
        category: "Work",
        completed: false,
        important: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: "Plan study session",
        dueDate: "",
        priority: "medium",
        category: "Study",
        completed: false,
        important: false,
        createdAt: new Date().toISOString()
      }
    ];
  }

  function saveTasks() {
    localStorage.setItem("taskflow_tasks", JSON.stringify(tasks));
  }

  function clearForm() {
    $("#taskTitle").val("");
    $("#taskDate").val("");
    $("#taskPriority").val("medium");
    $("#taskCategory").val("Work");
    $(".add-btn").text("Add Task");
    $("#taskTitle").focus();
  }

  function renderTasks() {
    var visibleTasks = getVisibleTasks();
    var taskList = $("#taskList");

    taskList.empty();

    if (visibleTasks.length === 0) {
      $("#emptyState").show();
    } else {
      $("#emptyState").hide();
    }

    visibleTasks.forEach(function (task) {
      taskList.append(createTaskHtml(task));
    });

    updateStats();
  }

  function getVisibleTasks() {
    var searchText = $("#searchInput").val().toLowerCase();
    var sortType = $("#sortSelect").val();

    var filteredTasks = tasks.filter(function (task) {
      var matchesSearch =
        task.title.toLowerCase().includes(searchText) ||
        task.category.toLowerCase().includes(searchText) ||
        task.priority.toLowerCase().includes(searchText);

      if (!matchesSearch) {
        return false;
      }

      if (currentFilter === "active") {
        return task.completed === false;
      }

      if (currentFilter === "completed") {
        return task.completed === true;
      }

      if (currentFilter === "today") {
        return task.dueDate === getToday();
      }

      if (currentFilter === "overdue") {
        return isOverdue(task);
      }

      if (currentFilter === "important") {
        return task.important === true;
      }

      return true;
    });

    filteredTasks.sort(function (a, b) {
      if (sortType === "due") {
        return getDateValue(a.dueDate) - getDateValue(b.dueDate);
      }

      if (sortType === "priority") {
        return getPriorityValue(b.priority) - getPriorityValue(a.priority);
      }

      if (sortType === "name") {
        return a.title.localeCompare(b.title);
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return filteredTasks;
  }

  function createTaskHtml(task) {
    var completedClass = task.completed ? " completed" : "";
    var importantClass = task.important ? " active" : "";
    var checked = task.completed ? "checked" : "";
    var editButton = task.completed ? "" : '<button class="icon-btn edit-btn" type="button" title="Edit task">Edit</button>';
    var dateText = task.dueDate ? formatDate(task.dueDate) : "No due date";
    var overduePill = isOverdue(task) ? '<span class="pill overdue">Overdue</span>' : "";

    return (
      '<article class="task-item priority-' + task.priority + completedClass + '" data-id="' + task.id + '">' +
        '<div class="task-main">' +
          '<input class="task-check" type="checkbox" ' + checked + ' aria-label="Mark task complete">' +
          '<div class="task-content">' +
            '<p class="task-title">' + escapeHtml(task.title) + '</p>' +
            '<div class="meta-row">' +
              '<span class="pill">' + escapeHtml(task.category) + '</span>' +
              '<span class="pill ' + task.priority + '">' + capitalize(task.priority) + '</span>' +
              '<span class="pill">' + dateText + '</span>' +
              overduePill +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="task-actions">' +
          '<button class="icon-btn important-btn' + importantClass + '" type="button" title="Toggle important">*</button>' +
          editButton +
          '<button class="icon-btn delete-btn" type="button" title="Delete task">x</button>' +
        '</div>' +
      '</article>'
    );
  }

  function updateStats() {
    var total = tasks.length;
    var done = tasks.filter(function (task) {
      return task.completed;
    }).length;
    var today = tasks.filter(function (task) {
      return task.dueDate === getToday();
    }).length;
    var percent = total === 0 ? 0 : Math.round((done / total) * 100);

    $("#totalTasks").text(total);
    $("#doneTasks").text(done);
    $("#todayTasks").text(today);
    $("#progressText").text(percent + "%");
    $("#progressBar").css("width", percent + "%");
  }

  function isOverdue(task) {
    if (!task.dueDate || task.completed) {
      return false;
    }

    return task.dueDate < getToday();
  }

  function getToday() {
    var today = new Date();
    var year = today.getFullYear();
    var month = String(today.getMonth() + 1).padStart(2, "0");
    var day = String(today.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  }

  function getDateValue(dateText) {
    if (!dateText) {
      return 9999999999999;
    }

    return new Date(dateText).getTime();
  }

  function getPriorityValue(priority) {
    if (priority === "high") {
      return 3;
    }

    if (priority === "medium") {
      return 2;
    }

    return 1;
  }

  function formatDate(dateText) {
    var date = new Date(dateText + "T00:00:00");

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function escapeHtml(text) {
    return $("<div>").text(text).html();
  }

  function showToast(message) {
    $("#toast").text(message).addClass("show");

    setTimeout(function () {
      $("#toast").removeClass("show");
    }, 1600);
  }
});
