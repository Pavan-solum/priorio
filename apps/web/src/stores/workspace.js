import { defineStore } from 'pinia';
const today = new Date();
const dateOffset = (offset) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
};
const dateTimeOffset = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const previewData = {
    tasks: [
        { id: 'task-1', title: 'Share the Q4 hiring plan', detail: 'Finalize headcount notes with the leadership team.', dueDate: dateOffset(0), priority: 'high', status: 'in_progress', category: 'Work' },
        { id: 'task-2', title: 'Review Maya’s proposal', detail: 'Add feedback to the product brief before the review.', dueDate: dateOffset(0), priority: 'medium', status: 'pending', category: 'Work' },
        { id: 'task-3', title: 'Book annual check-up', detail: 'Find a time that works next week.', dueDate: dateOffset(2), priority: 'low', status: 'pending', category: 'Personal' },
        { id: 'task-4', title: 'Send revised invoice', detail: 'Include the updated project hours.', dueDate: dateOffset(-1), priority: 'critical', status: 'pending', category: 'Financial' },
    ],
    messages: [
        { id: 'message-1', sender: 'Maya Chen', initials: 'MC', subject: 'Re: Product launch timeline', preview: 'Could you share the updated milestones before our 2pm sync? I want to make sure the team is aligned.', source: 'Gmail', receivedAt: dateTimeOffset(0.5), priority: 'high', category: 'Work', requiresReply: true, starred: true, read: false, archived: false, summary: 'Maya is asking for the revised launch milestones before today’s 2pm sync.' },
        { id: 'message-2', sender: 'Design team', initials: 'DT', subject: 'Stand-up notes · Oct 31', preview: 'A quick recap from this morning. The new onboarding flow is ready for one final pass.', source: 'Teams', receivedAt: dateTimeOffset(2), priority: 'medium', category: 'Work', requiresReply: false, starred: false, read: true, archived: false, summary: 'The onboarding flow is ready for a final review. No direct reply requested.' },
        { id: 'message-3', sender: 'Jordan Lee', initials: 'JL', subject: 'Dinner this weekend?', preview: 'Found a little place near the river that looks lovely. Are you free Saturday evening?', source: 'Gmail', receivedAt: dateTimeOffset(4), priority: 'low', category: 'Personal', requiresReply: true, starred: false, read: false, archived: false, summary: 'Jordan is asking whether you are available for dinner on Saturday evening.' },
        { id: 'message-4', sender: 'Northstar Finance', initials: 'NF', subject: 'October statement is ready', preview: 'Your monthly statement is available to view in your account.', source: 'Gmail', receivedAt: dateTimeOffset(22), priority: 'medium', category: 'Financial', requiresReply: false, starred: false, read: true, archived: false, summary: 'A monthly account statement is ready. No action was identified in the preview.' },
        { id: 'message-5', sender: 'Product updates', initials: 'PU', subject: 'What’s new this month', preview: 'A few improvements to help your team stay focused and move work forward.', source: 'Gmail', receivedAt: dateTimeOffset(30), priority: 'low', category: 'Informational', requiresReply: false, starred: false, read: true, archived: false, summary: 'A product newsletter with general updates.' },
    ],
    reminders: [
        { id: 'reminder-1', title: 'Project sync with Maya', time: 'Today · 2:00 PM', completed: false },
        { id: 'reminder-2', title: 'Pay internet bill', time: 'Today · 6:00 PM', completed: false },
        { id: 'reminder-3', title: 'Pick up groceries', time: 'Tomorrow · 5:30 PM', completed: false },
    ],
};
const storageKey = 'priorio-preview-v1';
function readWorkspace() {
    try {
        const saved = localStorage.getItem(storageKey);
        return saved ? { ...previewData, ...JSON.parse(saved) } : structuredClone(previewData);
    }
    catch {
        return structuredClone(previewData);
    }
}
export const useWorkspaceStore = defineStore('workspace', {
    state: () => readWorkspace(),
    actions: {
        persist() {
            localStorage.setItem(storageKey, JSON.stringify({ tasks: this.tasks, messages: this.messages, reminders: this.reminders }));
        },
        addTask(task) {
            this.tasks.unshift({ ...task, id: crypto.randomUUID(), status: 'pending' });
            this.persist();
        },
        setTaskStatus(id, status) {
            const task = this.tasks.find((item) => item.id === id);
            if (task)
                task.status = status;
            this.persist();
        },
        toggleStar(id) {
            const message = this.messages.find((item) => item.id === id);
            if (message)
                message.starred = !message.starred;
            this.persist();
        },
        markRead(id) {
            const message = this.messages.find((item) => item.id === id);
            if (message)
                message.read = true;
            this.persist();
        },
        archiveMessage(id) {
            const message = this.messages.find((item) => item.id === id);
            if (message)
                message.archived = true;
            this.persist();
        },
        setReminderCompleted(id, completed) {
            const reminder = this.reminders.find((item) => item.id === id);
            if (reminder)
                reminder.completed = completed;
            this.persist();
        },
        resetPreview() {
            this.tasks = structuredClone(previewData.tasks);
            this.messages = structuredClone(previewData.messages);
            this.reminders = structuredClone(previewData.reminders);
            this.persist();
        },
    },
});
