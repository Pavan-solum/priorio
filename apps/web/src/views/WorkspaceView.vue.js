import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { Archive, ArrowUpRight, Bell, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Clock3, Command, Filter, Inbox, LayoutDashboard, ListTodo, Mail, Menu, MessageCircle, MoreHorizontal, Plus, Search, Send, Settings2, ShieldCheck, Sparkles, Star, X, } from 'lucide-vue-next';
import { useWorkspaceStore } from '../stores/workspace';
const route = useRoute();
const router = useRouter();
const workspace = useWorkspaceStore();
const activeSection = computed(() => String(route.name ?? 'today'));
const searchQuery = ref('');
const inboxFilter = ref('All');
const taskView = ref('List');
const selectedMessageId = ref(null);
const taskDialogOpen = ref(false);
const taskTitle = ref('');
const taskDetail = ref('');
const taskDueDate = ref(new Date().toISOString().slice(0, 10));
const taskPriority = ref('medium');
const mobileMenuOpen = ref(false);
const primaryNavigation = [
    { name: 'today', label: 'Today', icon: LayoutDashboard },
    { name: 'inbox', label: 'Smart inbox', icon: Inbox, count: computed(() => workspace.messages.filter((message) => !message.archived && !message.read).length) },
    { name: 'tasks', label: 'My tasks', icon: ListTodo, count: computed(() => workspace.tasks.filter((task) => task.status !== 'completed').length) },
    { name: 'reminders', label: 'Reminders', icon: Bell },
    { name: 'followups', label: 'Follow-ups', icon: Send },
];
const secondaryNavigation = [
    { name: 'assistant', label: 'AI assistant', icon: Sparkles },
    { name: 'knowledge', label: 'Knowledge hub', icon: BookOpen },
    { name: 'integrations', label: 'Integrations', icon: Command },
    { name: 'settings', label: 'Settings', icon: Settings2 },
];
const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
const greeting = computed(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
});
const openTasks = computed(() => workspace.tasks.filter((task) => task.status !== 'completed'));
const todayTasks = computed(() => openTasks.value.filter((task) => task.dueDate <= new Date().toISOString().slice(0, 10)));
const importantMessages = computed(() => workspace.messages.filter((message) => !message.archived && (message.starred || message.priority === 'critical' || message.priority === 'high')).slice(0, 3));
const inboxMessages = computed(() => workspace.messages.filter((message) => {
    if (message.archived)
        return false;
    const query = searchQuery.value.trim().toLowerCase();
    const matchesQuery = !query || `${message.sender} ${message.subject} ${message.preview}`.toLowerCase().includes(query);
    const matchesFilter = inboxFilter.value === 'All'
        || (inboxFilter.value === 'Important' && message.starred)
        || (inboxFilter.value === 'Urgent' && (message.priority === 'critical' || message.priority === 'high'))
        || (inboxFilter.value === 'Needs reply' && message.requiresReply)
        || message.category === inboxFilter.value;
    return matchesQuery && matchesFilter;
}));
const visibleTasks = computed(() => workspace.tasks.filter((task) => {
    const query = searchQuery.value.trim().toLowerCase();
    return !query || `${task.title} ${task.detail} ${task.category}`.toLowerCase().includes(query);
}));
const selectedMessage = computed(() => workspace.messages.find((message) => message.id === selectedMessageId.value) ?? null);
const pendingReplies = computed(() => workspace.messages.filter((message) => !message.archived && message.requiresReply));
const activeReminders = computed(() => workspace.reminders.filter((reminder) => !reminder.completed));
const pageTitle = computed(() => String(route.meta.title ?? 'Today'));
watch(selectedMessage, (message) => {
    if (message && !message.read)
        workspace.markRead(message.id);
});
function openTaskDialog() {
    taskTitle.value = '';
    taskDetail.value = '';
    taskDueDate.value = new Date().toISOString().slice(0, 10);
    taskPriority.value = 'medium';
    taskDialogOpen.value = true;
}
function createTask() {
    if (!taskTitle.value.trim())
        return;
    workspace.addTask({ title: taskTitle.value.trim(), detail: taskDetail.value.trim(), dueDate: taskDueDate.value, priority: taskPriority.value, category: 'Work' });
    taskDialogOpen.value = false;
}
function openMessage(message) {
    selectedMessageId.value = message.id;
}
function archiveSelectedMessage() {
    if (!selectedMessageId.value)
        return;
    workspace.archiveMessage(selectedMessageId.value);
    selectedMessageId.value = null;
}
function sourceIcon(source) {
    return source === 'Teams' ? MessageCircle : source === 'WhatsApp preview' ? MessageCircle : Mail;
}
function sourceClass(source) {
    return source === 'Teams' ? 'source-teams' : source === 'WhatsApp preview' ? 'source-whatsapp' : 'source-gmail';
}
function priorityLabel(priority) {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
}
function relativeTime(value) {
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (elapsedMinutes < 60)
        return `${elapsedMinutes}m ago`;
    if (elapsedMinutes < 1440)
        return `${Math.floor(elapsedMinutes / 60)}h ago`;
    return `${Math.floor(elapsedMinutes / 1440)}d ago`;
}
function formatDueDate(value) {
    const todayDate = new Date().toISOString().slice(0, 10);
    if (value === todayDate)
        return 'Today';
    if (value < todayDate)
        return 'Overdue';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`));
}
function navigateTo(name) {
    router.push({ name });
    mobileMenuOpen.value = false;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workspace-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "sidebar" },
    ...{ class: ({ 'sidebar-open': __VLS_ctx.mobileMenuOpen }) },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "brand-lockup" },
    to: "/",
    'aria-label': "Priorio home",
}));
const __VLS_2 = __VLS_1({
    ...{ class: "brand-lockup" },
    to: "/",
    'aria-label': "Priorio home",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "brand-mark" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "brand-name" },
});
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "workspace-switcher" },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "workspace-avatar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "workspace-name" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
const __VLS_4 = {}.ChevronDown;
/** @type {[typeof __VLS_components.ChevronDown, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    size: (15),
}));
const __VLS_6 = __VLS_5({
    size: (15),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "nav-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "primary-nav" },
    'aria-label': "Workspace navigation",
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.primaryNavigation))) {
    const __VLS_8 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        key: (item.name),
        to: ({ name: item.name }),
        ...{ class: "nav-link" },
        ...{ class: ({ 'nav-link-active': __VLS_ctx.activeSection === item.name }) },
    }));
    const __VLS_10 = __VLS_9({
        key: (item.name),
        to: ({ name: item.name }),
        ...{ class: "nav-link" },
        ...{ class: ({ 'nav-link-active': __VLS_ctx.activeSection === item.name }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    __VLS_11.slots.default;
    const __VLS_12 = ((item.icon));
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        size: (18),
        strokeWidth: (1.8),
    }));
    const __VLS_14 = __VLS_13({
        size: (18),
        strokeWidth: (1.8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.label);
    if (item.count?.value) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "nav-count" },
        });
        (item.count.value);
    }
    var __VLS_11;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "nav-label nav-label-spaced" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "primary-nav" },
    'aria-label': "Personal tools",
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.secondaryNavigation))) {
    const __VLS_16 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        key: (item.name),
        to: ({ name: item.name }),
        ...{ class: "nav-link" },
        ...{ class: ({ 'nav-link-active': __VLS_ctx.activeSection === item.name }) },
    }));
    const __VLS_18 = __VLS_17({
        key: (item.name),
        to: ({ name: item.name }),
        ...{ class: "nav-link" },
        ...{ class: ({ 'nav-link-active': __VLS_ctx.activeSection === item.name }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    __VLS_19.slots.default;
    const __VLS_20 = ((item.icon));
    // @ts-ignore
    const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
        size: (18),
        strokeWidth: (1.8),
    }));
    const __VLS_22 = __VLS_21({
        size: (18),
        strokeWidth: (1.8),
    }, ...__VLS_functionalComponentArgsRest(__VLS_21));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.label);
    if (item.name === 'integrations') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "nav-dot" },
        });
    }
    var __VLS_19;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-bottom" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "preview-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "preview-dot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.navigateTo('settings');
        } },
    ...{ class: "profile-button" },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-avatar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "profile-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
const __VLS_24 = {}.MoreHorizontal;
/** @type {[typeof __VLS_components.MoreHorizontal, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    size: (18),
}));
const __VLS_26 = __VLS_25({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
if (__VLS_ctx.mobileMenuOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.mobileMenuOpen))
                    return;
                __VLS_ctx.mobileMenuOpen = false;
            } },
        ...{ class: "mobile-scrim" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "main-area" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "topbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.mobileMenuOpen = !__VLS_ctx.mobileMenuOpen;
        } },
    ...{ class: "icon-button mobile-menu-button" },
    type: "button",
    'aria-label': "Open navigation",
});
const __VLS_28 = {}.Menu;
/** @type {[typeof __VLS_components.Menu, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    size: (19),
}));
const __VLS_30 = __VLS_29({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "breadcrumb" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_32 = {}.ChevronRight;
/** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    size: (14),
}));
const __VLS_34 = __VLS_33({
    size: (14),
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.pageTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "topbar-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "global-search" },
});
const __VLS_36 = {}.Search;
/** @type {[typeof __VLS_components.Search, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    size: (16),
}));
const __VLS_38 = __VLS_37({
    size: (16),
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "Search anything",
    'aria-label': "Search tasks and messages",
});
(__VLS_ctx.searchQuery);
__VLS_asFunctionalElement(__VLS_intrinsicElements.kbd, __VLS_intrinsicElements.kbd)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "icon-button topbar-bell" },
    type: "button",
    'aria-label': "Notifications",
});
const __VLS_40 = {}.Bell;
/** @type {[typeof __VLS_components.Bell, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    size: (18),
}));
const __VLS_42 = __VLS_41({
    size: (18),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "topbar-avatar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-content" },
});
if (__VLS_ctx.activeSection === 'today') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "dashboard-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "page-heading dashboard-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    (__VLS_ctx.todayLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    (__VLS_ctx.greeting);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "heading-period" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "heading-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openTaskDialog) },
        ...{ class: "button-primary" },
        type: "button",
    });
    const __VLS_44 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
        size: (17),
    }));
    const __VLS_46 = __VLS_45({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "briefing-banner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "briefing-icon" },
    });
    const __VLS_48 = {}.Sparkles;
    /** @type {[typeof __VLS_components.Sparkles, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        size: (19),
    }));
    const __VLS_50 = __VLS_49({
        size: (19),
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "briefing-copy" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "briefing-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "preview-tag" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.openTasks.length);
    (__VLS_ctx.pendingReplies.length);
    (__VLS_ctx.activeReminders.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'today'))
                    return;
                __VLS_ctx.navigateTo('assistant');
            } },
        ...{ class: "text-action" },
        type: "button",
    });
    const __VLS_52 = {}.ArrowUpRight;
    /** @type {[typeof __VLS_components.ArrowUpRight, ]} */ ;
    // @ts-ignore
    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
        size: (15),
    }));
    const __VLS_54 = __VLS_53({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-icon coral-icon" },
    });
    const __VLS_56 = {}.ListTodo;
    /** @type {[typeof __VLS_components.ListTodo, ]} */ ;
    // @ts-ignore
    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
        size: (18),
    }));
    const __VLS_58 = __VLS_57({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.openTasks.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-foot" },
    });
    (__VLS_ctx.todayTasks.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-icon green-icon" },
    });
    const __VLS_60 = {}.Inbox;
    /** @type {[typeof __VLS_components.Inbox, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        size: (18),
    }));
    const __VLS_62 = __VLS_61({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.workspace.messages.filter((message) => !message.archived && !message.read).length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-foot" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-icon yellow-icon" },
    });
    const __VLS_64 = {}.Send;
    /** @type {[typeof __VLS_components.Send, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        size: (18),
    }));
    const __VLS_66 = __VLS_65({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.pendingReplies.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-foot" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
        ...{ class: "stat-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-icon blue-icon" },
    });
    const __VLS_68 = {}.Clock3;
    /** @type {[typeof __VLS_components.Clock3, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        size: (18),
    }));
    const __VLS_70 = __VLS_69({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.activeReminders.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "stat-foot" },
    });
    (__VLS_ctx.activeReminders[0]?.time ?? 'Nothing scheduled');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dashboard-columns" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "content-panel focus-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "panel-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    const __VLS_72 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ class: "panel-link" },
        to: "/tasks",
    }));
    const __VLS_74 = __VLS_73({
        ...{ class: "panel-link" },
        to: "/tasks",
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_75.slots.default;
    const __VLS_76 = {}.ChevronRight;
    /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
    // @ts-ignore
    const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
        size: (15),
    }));
    const __VLS_78 = __VLS_77({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    var __VLS_75;
    if (__VLS_ctx.todayTasks.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "task-list" },
        });
        for (const [task] of __VLS_getVForSourceType((__VLS_ctx.todayTasks.slice(0, 4)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (task.id),
                ...{ class: "task-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeSection === 'today'))
                            return;
                        if (!(__VLS_ctx.todayTasks.length))
                            return;
                        __VLS_ctx.workspace.setTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed');
                    } },
                ...{ class: "task-check" },
                ...{ class: ({ 'task-check-active': task.status === 'in_progress' }) },
                type: "button",
                'aria-label': (`Complete ${task.title}`),
            });
            if (task.status === 'completed') {
                const __VLS_80 = {}.Check;
                /** @type {[typeof __VLS_components.Check, ]} */ ;
                // @ts-ignore
                const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
                    size: (14),
                }));
                const __VLS_82 = __VLS_81({
                    size: (14),
                }, ...__VLS_functionalComponentArgsRest(__VLS_81));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "task-row-copy" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (task.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (task.detail);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "priority-pill" },
                ...{ class: (`priority-${task.priority}`) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
            (__VLS_ctx.priorityLabel(task.priority));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "task-due" },
                ...{ class: ({ 'task-overdue': task.dueDate < new Date().toISOString().slice(0, 10) }) },
            });
            (__VLS_ctx.formatDueDate(task.dueDate));
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state compact-empty" },
        });
        const __VLS_84 = {}.CheckCircle2;
        /** @type {[typeof __VLS_components.CheckCircle2, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            size: (22),
        }));
        const __VLS_86 = __VLS_85({
            size: (22),
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openTaskDialog) },
        ...{ class: "add-task-inline" },
        type: "button",
    });
    const __VLS_88 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
        size: (16),
    }));
    const __VLS_90 = __VLS_89({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_89));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "content-panel reminders-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "panel-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    const __VLS_92 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
        ...{ class: "panel-link" },
        to: "/reminders",
    }));
    const __VLS_94 = __VLS_93({
        ...{ class: "panel-link" },
        to: "/reminders",
    }, ...__VLS_functionalComponentArgsRest(__VLS_93));
    __VLS_95.slots.default;
    const __VLS_96 = {}.ChevronRight;
    /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
    // @ts-ignore
    const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
        size: (15),
    }));
    const __VLS_98 = __VLS_97({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_97));
    var __VLS_95;
    if (__VLS_ctx.activeReminders.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "reminder-list" },
        });
        for (const [reminder] of __VLS_getVForSourceType((__VLS_ctx.activeReminders.slice(0, 3)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (reminder.id),
                ...{ class: "reminder-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "reminder-marker" },
            });
            const __VLS_100 = {}.CalendarDays;
            /** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
            // @ts-ignore
            const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
                size: (16),
            }));
            const __VLS_102 = __VLS_101({
                size: (16),
            }, ...__VLS_functionalComponentArgsRest(__VLS_101));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (reminder.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (reminder.time);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeSection === 'today'))
                            return;
                        if (!(__VLS_ctx.activeReminders.length))
                            return;
                        __VLS_ctx.workspace.setReminderCompleted(reminder.id, true);
                    } },
                ...{ class: "quiet-icon" },
                type: "button",
                'aria-label': (`Complete ${reminder.title}`),
            });
            const __VLS_104 = {}.Check;
            /** @type {[typeof __VLS_components.Check, ]} */ ;
            // @ts-ignore
            const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
                size: (16),
            }));
            const __VLS_106 = __VLS_105({
                size: (16),
            }, ...__VLS_functionalComponentArgsRest(__VLS_105));
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state compact-empty" },
        });
        const __VLS_108 = {}.Bell;
        /** @type {[typeof __VLS_components.Bell, ]} */ ;
        // @ts-ignore
        const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
            size: (21),
        }));
        const __VLS_110 = __VLS_109({
            size: (21),
        }, ...__VLS_functionalComponentArgsRest(__VLS_109));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    const __VLS_112 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
        ...{ class: "add-task-inline" },
        to: "/reminders",
    }));
    const __VLS_114 = __VLS_113({
        ...{ class: "add-task-inline" },
        to: "/reminders",
    }, ...__VLS_functionalComponentArgsRest(__VLS_113));
    __VLS_115.slots.default;
    const __VLS_116 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
        size: (16),
    }));
    const __VLS_118 = __VLS_117({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_117));
    var __VLS_115;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "content-panel messages-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "panel-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    const __VLS_120 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
        ...{ class: "panel-link" },
        to: "/inbox",
    }));
    const __VLS_122 = __VLS_121({
        ...{ class: "panel-link" },
        to: "/inbox",
    }, ...__VLS_functionalComponentArgsRest(__VLS_121));
    __VLS_123.slots.default;
    const __VLS_124 = {}.ChevronRight;
    /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
    // @ts-ignore
    const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
        size: (15),
    }));
    const __VLS_126 = __VLS_125({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_125));
    var __VLS_123;
    if (__VLS_ctx.importantMessages.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "message-preview-grid" },
        });
        for (const [message] of __VLS_getVForSourceType((__VLS_ctx.importantMessages))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeSection === 'today'))
                            return;
                        if (!(__VLS_ctx.importantMessages.length))
                            return;
                        __VLS_ctx.openMessage(message);
                    } },
                key: (message.id),
                ...{ class: "message-preview" },
                type: "button",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "message-source" },
                ...{ class: (__VLS_ctx.sourceClass(message.source)) },
            });
            const __VLS_128 = ((__VLS_ctx.sourceIcon(message.source)));
            // @ts-ignore
            const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
                size: (14),
            }));
            const __VLS_130 = __VLS_129({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_129));
            (message.source);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "message-preview-time" },
            });
            (__VLS_ctx.relativeTime(message.receivedAt));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "message-sender" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "sender-avatar" },
            });
            (message.initials);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (message.sender);
            if (message.starred) {
                const __VLS_132 = {}.Star;
                /** @type {[typeof __VLS_components.Star, ]} */ ;
                // @ts-ignore
                const __VLS_133 = __VLS_asFunctionalComponent(__VLS_132, new __VLS_132({
                    size: (14),
                    ...{ class: "star-fill" },
                }));
                const __VLS_134 = __VLS_133({
                    size: (14),
                    ...{ class: "star-fill" },
                }, ...__VLS_functionalComponentArgsRest(__VLS_133));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
                ...{ class: "message-subject" },
            });
            (message.subject);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "message-excerpt" },
            });
            (message.preview);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "message-bottom" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "priority-pill" },
                ...{ class: (`priority-${message.priority}`) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
            (__VLS_ctx.priorityLabel(message.priority));
            if (message.requiresReply) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "reply-needed" },
                });
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
        const __VLS_136 = {}.Inbox;
        /** @type {[typeof __VLS_components.Inbox, ]} */ ;
        // @ts-ignore
        const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
            size: (24),
        }));
        const __VLS_138 = __VLS_137({
            size: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_137));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_140 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
            ...{ class: "text-action" },
            to: "/integrations",
        }));
        const __VLS_142 = __VLS_141({
            ...{ class: "text-action" },
            to: "/integrations",
        }, ...__VLS_functionalComponentArgsRest(__VLS_141));
        __VLS_143.slots.default;
        const __VLS_144 = {}.ArrowUpRight;
        /** @type {[typeof __VLS_components.ArrowUpRight, ]} */ ;
        // @ts-ignore
        const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
            size: (15),
        }));
        const __VLS_146 = __VLS_145({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_145));
        var __VLS_143;
    }
}
else if (__VLS_ctx.activeSection === 'inbox') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inner-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "page-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "heading-period" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "heading-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "connection-indicator" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inbox-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "filter-tabs" },
    });
    for (const [filter] of __VLS_getVForSourceType((['All', 'Important', 'Urgent', 'Needs reply', 'Work', 'Personal', 'Financial']))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.activeSection === 'today'))
                        return;
                    if (!(__VLS_ctx.activeSection === 'inbox'))
                        return;
                    __VLS_ctx.inboxFilter = filter;
                } },
            key: (filter),
            type: "button",
            ...{ class: ({ 'filter-active': __VLS_ctx.inboxFilter === filter }) },
        });
        (filter);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "icon-button filter-button" },
        type: "button",
        title: "Filters",
    });
    const __VLS_148 = {}.Filter;
    /** @type {[typeof __VLS_components.Filter, ]} */ ;
    // @ts-ignore
    const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
        size: (17),
    }));
    const __VLS_150 = __VLS_149({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_149));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inbox-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "inbox-list" },
    });
    for (const [message] of __VLS_getVForSourceType((__VLS_ctx.inboxMessages))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (message.id),
            ...{ class: "inbox-row" },
            ...{ class: ({ 'inbox-row-selected': __VLS_ctx.selectedMessageId === message.id, 'inbox-row-unread': !message.read }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.activeSection === 'today'))
                        return;
                    if (!(__VLS_ctx.activeSection === 'inbox'))
                        return;
                    __VLS_ctx.openMessage(message);
                } },
            ...{ class: "inbox-row-open" },
            type: "button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sender-avatar" },
        });
        (message.initials);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "inbox-row-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "inbox-row-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (message.sender);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.time, __VLS_intrinsicElements.time)({});
        (__VLS_ctx.relativeTime(message.receivedAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
            ...{ class: "inbox-row-subject" },
        });
        (message.subject);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "inbox-row-preview" },
        });
        (message.preview);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "inbox-row-tags" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "source-tag" },
            ...{ class: (__VLS_ctx.sourceClass(message.source)) },
        });
        const __VLS_152 = ((__VLS_ctx.sourceIcon(message.source)));
        // @ts-ignore
        const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
            size: (12),
        }));
        const __VLS_154 = __VLS_153({
            size: (12),
        }, ...__VLS_functionalComponentArgsRest(__VLS_153));
        (message.source);
        if (message.requiresReply) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "reply-needed" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "category-tag" },
        });
        (message.category);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.activeSection === 'today'))
                        return;
                    if (!(__VLS_ctx.activeSection === 'inbox'))
                        return;
                    __VLS_ctx.workspace.toggleStar(message.id);
                } },
            ...{ class: "row-star" },
            type: "button",
            'aria-label': (message.starred ? 'Remove important' : 'Mark important'),
        });
        const __VLS_156 = {}.Star;
        /** @type {[typeof __VLS_components.Star, ]} */ ;
        // @ts-ignore
        const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
            size: (16),
            ...{ class: ({ 'star-fill': message.starred }) },
        }));
        const __VLS_158 = __VLS_157({
            size: (16),
            ...{ class: ({ 'star-fill': message.starred }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_157));
    }
    if (!__VLS_ctx.inboxMessages.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state list-empty" },
        });
        const __VLS_160 = {}.Inbox;
        /** @type {[typeof __VLS_components.Inbox, ]} */ ;
        // @ts-ignore
        const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
            size: (23),
        }));
        const __VLS_162 = __VLS_161({
            size: (23),
        }, ...__VLS_functionalComponentArgsRest(__VLS_161));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "list-footer" },
    });
    (__VLS_ctx.inboxMessages.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "message-detail" },
    });
    if (__VLS_ctx.selectedMessage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-toolbar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "detail-source" },
            ...{ class: (__VLS_ctx.sourceClass(__VLS_ctx.selectedMessage.source)) },
        });
        const __VLS_164 = ((__VLS_ctx.sourceIcon(__VLS_ctx.selectedMessage.source)));
        // @ts-ignore
        const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
            size: (14),
        }));
        const __VLS_166 = __VLS_165({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_165));
        (__VLS_ctx.selectedMessage.source);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.activeSection === 'today'))
                        return;
                    if (!(__VLS_ctx.activeSection === 'inbox'))
                        return;
                    if (!(__VLS_ctx.selectedMessage))
                        return;
                    __VLS_ctx.workspace.toggleStar(__VLS_ctx.selectedMessage.id);
                } },
            ...{ class: "quiet-icon" },
            type: "button",
            'aria-label': "Mark important",
        });
        const __VLS_168 = {}.Star;
        /** @type {[typeof __VLS_components.Star, ]} */ ;
        // @ts-ignore
        const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
            size: (17),
            ...{ class: ({ 'star-fill': __VLS_ctx.selectedMessage.starred }) },
        }));
        const __VLS_170 = __VLS_169({
            size: (17),
            ...{ class: ({ 'star-fill': __VLS_ctx.selectedMessage.starred }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_169));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.archiveSelectedMessage) },
            ...{ class: "quiet-icon" },
            type: "button",
            'aria-label': "Archive",
        });
        const __VLS_172 = {}.Archive;
        /** @type {[typeof __VLS_components.Archive, ]} */ ;
        // @ts-ignore
        const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
            size: (17),
        }));
        const __VLS_174 = __VLS_173({
            size: (17),
        }, ...__VLS_functionalComponentArgsRest(__VLS_173));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-message" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "detail-category" },
        });
        (__VLS_ctx.selectedMessage.category);
        (__VLS_ctx.priorityLabel(__VLS_ctx.selectedMessage.priority));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        (__VLS_ctx.selectedMessage.subject);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-sender" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sender-avatar large-avatar" },
        });
        (__VLS_ctx.selectedMessage.initials);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedMessage.sender);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.relativeTime(__VLS_ctx.selectedMessage.receivedAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.selectedMessage.preview);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ai-summary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "summary-label" },
        });
        const __VLS_176 = {}.Sparkles;
        /** @type {[typeof __VLS_components.Sparkles, ]} */ ;
        // @ts-ignore
        const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
            size: (14),
        }));
        const __VLS_178 = __VLS_177({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_177));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "preview-tag" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.selectedMessage.summary);
        if (__VLS_ctx.selectedMessage.requiresReply) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "suggested-action" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "action-dot" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ class: "text-action" },
                type: "button",
                disabled: true,
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-footer" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        const __VLS_180 = {}.ShieldCheck;
        /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
        // @ts-ignore
        const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
            size: (14),
        }));
        const __VLS_182 = __VLS_181({
            size: (14),
        }, ...__VLS_functionalComponentArgsRest(__VLS_181));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.activeSection === 'today'))
                        return;
                    if (!(__VLS_ctx.activeSection === 'inbox'))
                        return;
                    if (!(__VLS_ctx.selectedMessage))
                        return;
                    __VLS_ctx.selectedMessageId = null;
                } },
            type: "button",
            ...{ class: "button-outline" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-placeholder" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-placeholder-icon" },
        });
        const __VLS_184 = {}.Mail;
        /** @type {[typeof __VLS_components.Mail, ]} */ ;
        // @ts-ignore
        const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
            size: (22),
        }));
        const __VLS_186 = __VLS_185({
            size: (22),
        }, ...__VLS_functionalComponentArgsRest(__VLS_185));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
}
else if (__VLS_ctx.activeSection === 'tasks') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inner-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "page-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "heading-period" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "heading-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.openTaskDialog) },
        ...{ class: "button-primary" },
        type: "button",
    });
    const __VLS_188 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
        size: (17),
    }));
    const __VLS_190 = __VLS_189({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_189));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tasks-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "task-summary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.openTasks.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.workspace.tasks.filter((task) => task.status === 'completed').length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "view-switch" },
    });
    for (const [view] of __VLS_getVForSourceType(['List', 'Board'])) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.activeSection === 'today'))
                        return;
                    if (!!(__VLS_ctx.activeSection === 'inbox'))
                        return;
                    if (!(__VLS_ctx.activeSection === 'tasks'))
                        return;
                    __VLS_ctx.taskView = view;
                } },
            key: (view),
            type: "button",
            ...{ class: ({ 'view-active': __VLS_ctx.taskView === view }) },
        });
        (view);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "filter-button text-filter" },
        type: "button",
    });
    const __VLS_192 = {}.Filter;
    /** @type {[typeof __VLS_components.Filter, ]} */ ;
    // @ts-ignore
    const __VLS_193 = __VLS_asFunctionalComponent(__VLS_192, new __VLS_192({
        size: (15),
    }));
    const __VLS_194 = __VLS_193({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_193));
    if (__VLS_ctx.taskView === 'List') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "content-panel task-table-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "task-table-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        for (const [task] of __VLS_getVForSourceType((__VLS_ctx.visibleTasks))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (task.id),
                ...{ class: "task-table-row" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.activeSection === 'today'))
                            return;
                        if (!!(__VLS_ctx.activeSection === 'inbox'))
                            return;
                        if (!(__VLS_ctx.activeSection === 'tasks'))
                            return;
                        if (!(__VLS_ctx.taskView === 'List'))
                            return;
                        __VLS_ctx.workspace.setTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed');
                    } },
                ...{ class: "task-check" },
                ...{ class: ({ 'task-check-done': task.status === 'completed' }) },
                type: "button",
                'aria-label': (`Toggle ${task.title}`),
            });
            if (task.status === 'completed') {
                const __VLS_196 = {}.Check;
                /** @type {[typeof __VLS_components.Check, ]} */ ;
                // @ts-ignore
                const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
                    size: (14),
                }));
                const __VLS_198 = __VLS_197({
                    size: (14),
                }, ...__VLS_functionalComponentArgsRest(__VLS_197));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "task-cell-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({
                ...{ class: ({ 'completed-title': task.status === 'completed' }) },
            });
            (task.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (task.detail || task.category);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "priority-pill" },
                ...{ class: (`priority-${task.priority}`) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
            (__VLS_ctx.priorityLabel(task.priority));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "task-due" },
                ...{ class: ({ 'task-overdue': task.dueDate < new Date().toISOString().slice(0, 10) && task.status !== 'completed' }) },
            });
            (__VLS_ctx.formatDueDate(task.dueDate));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                ...{ onChange: (...[$event]) => {
                        if (!!(__VLS_ctx.activeSection === 'today'))
                            return;
                        if (!!(__VLS_ctx.activeSection === 'inbox'))
                            return;
                        if (!(__VLS_ctx.activeSection === 'tasks'))
                            return;
                        if (!(__VLS_ctx.taskView === 'List'))
                            return;
                        __VLS_ctx.workspace.setTaskStatus(task.id, $event.target.value);
                    } },
                ...{ class: "status-select" },
                value: (task.status),
                'aria-label': "Task status",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "pending",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "in_progress",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                value: "completed",
            });
        }
        if (!__VLS_ctx.visibleTasks.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "empty-state" },
            });
            const __VLS_200 = {}.ListTodo;
            /** @type {[typeof __VLS_components.ListTodo, ]} */ ;
            // @ts-ignore
            const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
                size: (23),
            }));
            const __VLS_202 = __VLS_201({
                size: (23),
            }, ...__VLS_functionalComponentArgsRest(__VLS_201));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.openTaskDialog) },
                ...{ class: "text-action" },
                type: "button",
            });
            const __VLS_204 = {}.Plus;
            /** @type {[typeof __VLS_components.Plus, ]} */ ;
            // @ts-ignore
            const __VLS_205 = __VLS_asFunctionalComponent(__VLS_204, new __VLS_204({
                size: (15),
            }));
            const __VLS_206 = __VLS_205({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_205));
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "kanban-grid" },
        });
        for (const [column] of __VLS_getVForSourceType([{ key: 'pending', label: 'To do' }, { key: 'in_progress', label: 'In progress' }, { key: 'completed', label: 'Done' }])) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
                key: (column.key),
                ...{ class: "kanban-column" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "kanban-heading" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (column.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.visibleTasks.filter((task) => task.status === column.key).length);
            for (const [task] of __VLS_getVForSourceType((__VLS_ctx.visibleTasks.filter((item) => item.status === column.key)))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                    key: (task.id),
                    ...{ class: "kanban-card" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "priority-pill" },
                    ...{ class: (`priority-${task.priority}`) },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
                (__VLS_ctx.priorityLabel(task.priority));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
                (task.title);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (task.detail);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                (__VLS_ctx.formatDueDate(task.dueDate));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
                    ...{ onChange: (...[$event]) => {
                            if (!!(__VLS_ctx.activeSection === 'today'))
                                return;
                            if (!!(__VLS_ctx.activeSection === 'inbox'))
                                return;
                            if (!(__VLS_ctx.activeSection === 'tasks'))
                                return;
                            if (!!(__VLS_ctx.taskView === 'List'))
                                return;
                            __VLS_ctx.workspace.setTaskStatus(task.id, $event.target.value);
                        } },
                    value: (task.status),
                    'aria-label': (`Move ${task.title}`),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: "pending",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: "in_progress",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                    value: "completed",
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.openTaskDialog) },
                ...{ class: "add-task-inline" },
                type: "button",
            });
            const __VLS_208 = {}.Plus;
            /** @type {[typeof __VLS_components.Plus, ]} */ ;
            // @ts-ignore
            const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
                size: (15),
            }));
            const __VLS_210 = __VLS_209({
                size: (15),
            }, ...__VLS_functionalComponentArgsRest(__VLS_209));
        }
    }
}
else if (__VLS_ctx.activeSection === 'reminders') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inner-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "page-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "heading-period" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "heading-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "connection-indicator" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "content-panel reminder-page-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "panel-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "muted-count" },
    });
    (__VLS_ctx.activeReminders.length);
    for (const [reminder] of __VLS_getVForSourceType((__VLS_ctx.workspace.reminders))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (reminder.id),
            ...{ class: "reminder-page-row" },
            ...{ class: ({ 'reminder-done': reminder.completed }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.activeSection === 'today'))
                        return;
                    if (!!(__VLS_ctx.activeSection === 'inbox'))
                        return;
                    if (!!(__VLS_ctx.activeSection === 'tasks'))
                        return;
                    if (!(__VLS_ctx.activeSection === 'reminders'))
                        return;
                    __VLS_ctx.workspace.setReminderCompleted(reminder.id, !reminder.completed);
                } },
            ...{ class: "task-check" },
            ...{ class: ({ 'task-check-done': reminder.completed }) },
            type: "button",
            'aria-label': (`Toggle ${reminder.title}`),
        });
        if (reminder.completed) {
            const __VLS_212 = {}.Check;
            /** @type {[typeof __VLS_components.Check, ]} */ ;
            // @ts-ignore
            const __VLS_213 = __VLS_asFunctionalComponent(__VLS_212, new __VLS_212({
                size: (14),
            }));
            const __VLS_214 = __VLS_213({
                size: (14),
            }, ...__VLS_functionalComponentArgsRest(__VLS_213));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "reminder-marker" },
        });
        const __VLS_216 = {}.CalendarDays;
        /** @type {[typeof __VLS_components.CalendarDays, ]} */ ;
        // @ts-ignore
        const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
            size: (16),
        }));
        const __VLS_218 = __VLS_217({
            size: (16),
        }, ...__VLS_functionalComponentArgsRest(__VLS_217));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (reminder.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (reminder.time);
        if (reminder.completed) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "completed-label" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.activeSection === 'today'))
                            return;
                        if (!!(__VLS_ctx.activeSection === 'inbox'))
                            return;
                        if (!!(__VLS_ctx.activeSection === 'tasks'))
                            return;
                        if (!(__VLS_ctx.activeSection === 'reminders'))
                            return;
                        if (!!(reminder.completed))
                            return;
                        reminder.time = 'Tomorrow · 9:00 AM';
                        __VLS_ctx.workspace.persist();
                    } },
                ...{ class: "quiet-icon" },
                type: "button",
                title: "Snooze reminder",
            });
            const __VLS_220 = {}.Clock3;
            /** @type {[typeof __VLS_components.Clock3, ]} */ ;
            // @ts-ignore
            const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
                size: (17),
            }));
            const __VLS_222 = __VLS_221({
                size: (17),
            }, ...__VLS_functionalComponentArgsRest(__VLS_221));
        }
    }
    if (!__VLS_ctx.workspace.reminders.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
        const __VLS_224 = {}.Bell;
        /** @type {[typeof __VLS_components.Bell, ]} */ ;
        // @ts-ignore
        const __VLS_225 = __VLS_asFunctionalComponent(__VLS_224, new __VLS_224({
            size: (24),
        }));
        const __VLS_226 = __VLS_225({
            size: (24),
        }, ...__VLS_functionalComponentArgsRest(__VLS_225));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "reminder-note" },
    });
    const __VLS_228 = {}.ShieldCheck;
    /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
    // @ts-ignore
    const __VLS_229 = __VLS_asFunctionalComponent(__VLS_228, new __VLS_228({
        size: (16),
    }));
    const __VLS_230 = __VLS_229({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_229));
}
else if (__VLS_ctx.activeSection === 'followups') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inner-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "page-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "heading-period" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "heading-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "connection-indicator" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    (__VLS_ctx.pendingReplies.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "followup-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "content-panel followup-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "panel-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "muted-count" },
    });
    (__VLS_ctx.pendingReplies.length);
    for (const [message] of __VLS_getVForSourceType((__VLS_ctx.pendingReplies))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.activeSection === 'today'))
                        return;
                    if (!!(__VLS_ctx.activeSection === 'inbox'))
                        return;
                    if (!!(__VLS_ctx.activeSection === 'tasks'))
                        return;
                    if (!!(__VLS_ctx.activeSection === 'reminders'))
                        return;
                    if (!(__VLS_ctx.activeSection === 'followups'))
                        return;
                    __VLS_ctx.navigateTo('inbox');
                    __VLS_ctx.selectedMessageId = message.id;
                } },
            key: (message.id),
            ...{ class: "followup-row" },
            type: "button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sender-avatar" },
        });
        (message.initials);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "followup-copy" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (message.sender);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
        (message.subject);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (message.preview);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (message.source);
        (__VLS_ctx.relativeTime(message.receivedAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "followup-status" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "reply-needed" },
        });
        const __VLS_232 = {}.ChevronRight;
        /** @type {[typeof __VLS_components.ChevronRight, ]} */ ;
        // @ts-ignore
        const __VLS_233 = __VLS_asFunctionalComponent(__VLS_232, new __VLS_232({
            size: (17),
        }));
        const __VLS_234 = __VLS_233({
            size: (17),
        }, ...__VLS_functionalComponentArgsRest(__VLS_233));
    }
    if (!__VLS_ctx.pendingReplies.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "empty-state" },
        });
        const __VLS_236 = {}.Send;
        /** @type {[typeof __VLS_components.Send, ]} */ ;
        // @ts-ignore
        const __VLS_237 = __VLS_asFunctionalComponent(__VLS_236, new __VLS_236({
            size: (22),
        }));
        const __VLS_238 = __VLS_237({
            size: (22),
        }, ...__VLS_functionalComponentArgsRest(__VLS_237));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "followup-aside" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "aside-icon" },
    });
    const __VLS_240 = {}.ShieldCheck;
    /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
    // @ts-ignore
    const __VLS_241 = __VLS_asFunctionalComponent(__VLS_240, new __VLS_240({
        size: (19),
    }));
    const __VLS_242 = __VLS_241({
        size: (19),
    }, ...__VLS_functionalComponentArgsRest(__VLS_241));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
else if (__VLS_ctx.activeSection === 'assistant') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inner-page assistant-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "page-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "heading-period" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "heading-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "connection-indicator unavailable" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "assistant-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "assistant-welcome" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "assistant-orb" },
    });
    const __VLS_244 = {}.Sparkles;
    /** @type {[typeof __VLS_components.Sparkles, ]} */ ;
    // @ts-ignore
    const __VLS_245 = __VLS_asFunctionalComponent(__VLS_244, new __VLS_244({
        size: (24),
    }));
    const __VLS_246 = __VLS_245({
        size: (24),
    }, ...__VLS_functionalComponentArgsRest(__VLS_245));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "panel-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-grid" },
    });
    for (const [prompt] of __VLS_getVForSourceType((['What should I focus on today?', 'Which conversations need a reply?', 'What deadlines are coming up?', 'Summarize my important messages']))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            key: (prompt),
            type: "button",
            disabled: true,
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (prompt);
        const __VLS_248 = {}.ArrowUpRight;
        /** @type {[typeof __VLS_components.ArrowUpRight, ]} */ ;
        // @ts-ignore
        const __VLS_249 = __VLS_asFunctionalComponent(__VLS_248, new __VLS_248({
            size: (15),
        }));
        const __VLS_250 = __VLS_249({
            size: (15),
        }, ...__VLS_functionalComponentArgsRest(__VLS_249));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "assistant-input" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        disabled: true,
        placeholder: "AI is unavailable in this preview",
        'aria-label': "Ask Priorio",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: "button",
        disabled: true,
        'aria-label': "Send message",
    });
    const __VLS_252 = {}.Send;
    /** @type {[typeof __VLS_components.Send, ]} */ ;
    // @ts-ignore
    const __VLS_253 = __VLS_asFunctionalComponent(__VLS_252, new __VLS_252({
        size: (17),
    }));
    const __VLS_254 = __VLS_253({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_253));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "assistant-disclaimer" },
    });
    const __VLS_256 = {}.ShieldCheck;
    /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
    // @ts-ignore
    const __VLS_257 = __VLS_asFunctionalComponent(__VLS_256, new __VLS_256({
        size: (14),
    }));
    const __VLS_258 = __VLS_257({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_257));
}
else if (__VLS_ctx.activeSection === 'knowledge') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inner-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "page-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "heading-period" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "heading-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "connection-indicator unavailable" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "content-panel knowledge-empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "knowledge-icon" },
    });
    const __VLS_260 = {}.BookOpen;
    /** @type {[typeof __VLS_components.BookOpen, ]} */ ;
    // @ts-ignore
    const __VLS_261 = __VLS_asFunctionalComponent(__VLS_260, new __VLS_260({
        size: (23),
    }));
    const __VLS_262 = __VLS_261({
        size: (23),
    }, ...__VLS_functionalComponentArgsRest(__VLS_261));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "button-outline" },
        type: "button",
        disabled: true,
    });
    const __VLS_264 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_265 = __VLS_asFunctionalComponent(__VLS_264, new __VLS_264({
        size: (16),
    }));
    const __VLS_266 = __VLS_265({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_265));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "privacy-line" },
    });
    const __VLS_268 = {}.ShieldCheck;
    /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
    // @ts-ignore
    const __VLS_269 = __VLS_asFunctionalComponent(__VLS_268, new __VLS_268({
        size: (14),
    }));
    const __VLS_270 = __VLS_269({
        size: (14),
    }, ...__VLS_functionalComponentArgsRest(__VLS_269));
}
else if (__VLS_ctx.activeSection === 'integrations') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inner-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "page-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "heading-period" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "heading-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "integration-notice" },
    });
    const __VLS_272 = {}.ShieldCheck;
    /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
    // @ts-ignore
    const __VLS_273 = __VLS_asFunctionalComponent(__VLS_272, new __VLS_272({
        size: (18),
    }));
    const __VLS_274 = __VLS_273({
        size: (18),
    }, ...__VLS_functionalComponentArgsRest(__VLS_273));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "integration-grid" },
    });
    for (const [integration] of __VLS_getVForSourceType(([{ name: 'Gmail', detail: 'Email, requests, and important updates', icon: __VLS_ctx.Mail, className: 'gmail-brand' }, { name: 'Microsoft Teams', detail: 'Messages and team commitments', icon: __VLS_ctx.MessageCircle, className: 'teams-brand' }, { name: 'WhatsApp previews', detail: 'Android notification previews only', icon: __VLS_ctx.MessageCircle, className: 'whatsapp-brand' }]))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (integration.name),
            ...{ class: "integration-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "integration-brand" },
            ...{ class: (integration.className) },
        });
        const __VLS_276 = ((integration.icon));
        // @ts-ignore
        const __VLS_277 = __VLS_asFunctionalComponent(__VLS_276, new __VLS_276({
            size: (19),
        }));
        const __VLS_278 = __VLS_277({
            size: (19),
        }, ...__VLS_functionalComponentArgsRest(__VLS_277));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "integration-status" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        (integration.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (integration.detail);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "button-outline" },
            type: "button",
            disabled: true,
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "whatsapp-note" },
    });
    const __VLS_280 = {}.ShieldCheck;
    /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
    // @ts-ignore
    const __VLS_281 = __VLS_asFunctionalComponent(__VLS_280, new __VLS_280({
        size: (17),
    }));
    const __VLS_282 = __VLS_281({
        size: (17),
    }, ...__VLS_functionalComponentArgsRest(__VLS_281));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "inner-page" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "page-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "heading-period" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "heading-subtitle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "content-panel settings-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "settings-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "settings-value" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "profile-avatar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "settings-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "settings-value plain-value" },
    });
    (Intl.DateTimeFormat().resolvedOptions().timeZone);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "settings-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "privacy-status" },
    });
    const __VLS_284 = {}.ShieldCheck;
    /** @type {[typeof __VLS_components.ShieldCheck, ]} */ ;
    // @ts-ignore
    const __VLS_285 = __VLS_asFunctionalComponent(__VLS_284, new __VLS_284({
        size: (15),
    }));
    const __VLS_286 = __VLS_285({
        size: (15),
    }, ...__VLS_functionalComponentArgsRest(__VLS_285));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "settings-section reset-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.workspace.resetPreview) },
        ...{ class: "button-outline" },
        type: "button",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "mobile-bottom-nav" },
    'aria-label': "Mobile navigation",
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.primaryNavigation.slice(0, 4)))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.navigateTo(item.name);
            } },
        key: (item.name),
        type: "button",
        ...{ class: ({ 'mobile-active': __VLS_ctx.activeSection === item.name }) },
    });
    const __VLS_288 = ((item.icon));
    // @ts-ignore
    const __VLS_289 = __VLS_asFunctionalComponent(__VLS_288, new __VLS_288({
        size: (19),
    }));
    const __VLS_290 = __VLS_289({
        size: (19),
    }, ...__VLS_functionalComponentArgsRest(__VLS_289));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (item.name === 'today' ? 'Home' : item.label.replace('Smart ', ''));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.navigateTo('assistant');
        } },
    type: "button",
    ...{ class: ({ 'mobile-active': __VLS_ctx.activeSection === 'assistant' }) },
});
const __VLS_292 = {}.Sparkles;
/** @type {[typeof __VLS_components.Sparkles, ]} */ ;
// @ts-ignore
const __VLS_293 = __VLS_asFunctionalComponent(__VLS_292, new __VLS_292({
    size: (19),
}));
const __VLS_294 = __VLS_293({
    size: (19),
}, ...__VLS_functionalComponentArgsRest(__VLS_293));
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
if (__VLS_ctx.taskDialogOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.taskDialogOpen))
                    return;
                __VLS_ctx.taskDialogOpen = false;
            } },
        ...{ class: "modal-backdrop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.createTask) },
        ...{ class: "task-modal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "panel-kicker" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.taskDialogOpen))
                    return;
                __VLS_ctx.taskDialogOpen = false;
            } },
        ...{ class: "quiet-icon" },
        type: "button",
        'aria-label': "Close",
    });
    const __VLS_296 = {}.X;
    /** @type {[typeof __VLS_components.X, ]} */ ;
    // @ts-ignore
    const __VLS_297 = __VLS_asFunctionalComponent(__VLS_296, new __VLS_296({
        size: (19),
    }));
    const __VLS_298 = __VLS_297({
        size: (19),
    }, ...__VLS_functionalComponentArgsRest(__VLS_297));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        autofocus: true,
        maxlength: "140",
        placeholder: "e.g. Send the project update",
        required: true,
    });
    (__VLS_ctx.taskTitle);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "optional-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.taskDetail),
        rows: "3",
        placeholder: "Add a little context",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "date",
    });
    (__VLS_ctx.taskDueDate);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.taskPriority),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "low",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "medium",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "high",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "critical",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.taskDialogOpen))
                    return;
                __VLS_ctx.taskDialogOpen = false;
            } },
        ...{ class: "button-outline" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "button-primary" },
        type: "submit",
    });
    const __VLS_300 = {}.Plus;
    /** @type {[typeof __VLS_components.Plus, ]} */ ;
    // @ts-ignore
    const __VLS_301 = __VLS_asFunctionalComponent(__VLS_300, new __VLS_300({
        size: (16),
    }));
    const __VLS_302 = __VLS_301({
        size: (16),
    }, ...__VLS_functionalComponentArgsRest(__VLS_301));
}
/** @type {__VLS_StyleScopedClasses['workspace-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-open']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-lockup']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['brand-name']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-name']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link-active']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-count']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-label-spaced']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link-active']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-bottom']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-note']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-button']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-scrim']} */ ;
/** @type {__VLS_StyleScopedClasses['main-area']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-menu-button']} */ ;
/** @type {__VLS_StyleScopedClasses['breadcrumb']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['global-search']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar-bell']} */ ;
/** @type {__VLS_StyleScopedClasses['topbar-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['page-content']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-period']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['briefing-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['briefing-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['briefing-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['briefing-title']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['text-action']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['coral-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['green-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['yellow-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['blue-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['dashboard-columns']} */ ;
/** @type {__VLS_StyleScopedClasses['content-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['focus-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-link']} */ ;
/** @type {__VLS_StyleScopedClasses['task-list']} */ ;
/** @type {__VLS_StyleScopedClasses['task-row']} */ ;
/** @type {__VLS_StyleScopedClasses['task-check']} */ ;
/** @type {__VLS_StyleScopedClasses['task-check-active']} */ ;
/** @type {__VLS_StyleScopedClasses['task-row-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['priority-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['task-due']} */ ;
/** @type {__VLS_StyleScopedClasses['task-overdue']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['add-task-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['content-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['reminders-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-link']} */ ;
/** @type {__VLS_StyleScopedClasses['reminder-list']} */ ;
/** @type {__VLS_StyleScopedClasses['reminder-row']} */ ;
/** @type {__VLS_StyleScopedClasses['reminder-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['quiet-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['add-task-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['content-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['messages-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-link']} */ ;
/** @type {__VLS_StyleScopedClasses['message-preview-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['message-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['message-source']} */ ;
/** @type {__VLS_StyleScopedClasses['message-preview-time']} */ ;
/** @type {__VLS_StyleScopedClasses['message-sender']} */ ;
/** @type {__VLS_StyleScopedClasses['sender-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['star-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['message-subject']} */ ;
/** @type {__VLS_StyleScopedClasses['message-excerpt']} */ ;
/** @type {__VLS_StyleScopedClasses['message-bottom']} */ ;
/** @type {__VLS_StyleScopedClasses['priority-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-needed']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['text-action']} */ ;
/** @type {__VLS_StyleScopedClasses['inner-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-period']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['connection-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-active']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-button']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-list']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-row']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-row-selected']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-row-unread']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-row-open']} */ ;
/** @type {__VLS_StyleScopedClasses['sender-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-row-main']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-row-top']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-row-subject']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-row-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['inbox-row-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['source-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-needed']} */ ;
/** @type {__VLS_StyleScopedClasses['category-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['row-star']} */ ;
/** @type {__VLS_StyleScopedClasses['star-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['list-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['list-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['message-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-source']} */ ;
/** @type {__VLS_StyleScopedClasses['quiet-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['star-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['quiet-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-message']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-category']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-sender']} */ ;
/** @type {__VLS_StyleScopedClasses['sender-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['large-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['ai-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-label']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['suggested-action']} */ ;
/** @type {__VLS_StyleScopedClasses['action-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['text-action']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['button-outline']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-placeholder-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['inner-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-period']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['tasks-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['task-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['view-switch']} */ ;
/** @type {__VLS_StyleScopedClasses['view-active']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-button']} */ ;
/** @type {__VLS_StyleScopedClasses['text-filter']} */ ;
/** @type {__VLS_StyleScopedClasses['content-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['task-table-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['task-table-head']} */ ;
/** @type {__VLS_StyleScopedClasses['task-table-row']} */ ;
/** @type {__VLS_StyleScopedClasses['task-check']} */ ;
/** @type {__VLS_StyleScopedClasses['task-check-done']} */ ;
/** @type {__VLS_StyleScopedClasses['task-cell-title']} */ ;
/** @type {__VLS_StyleScopedClasses['completed-title']} */ ;
/** @type {__VLS_StyleScopedClasses['priority-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['task-due']} */ ;
/** @type {__VLS_StyleScopedClasses['task-overdue']} */ ;
/** @type {__VLS_StyleScopedClasses['status-select']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['text-action']} */ ;
/** @type {__VLS_StyleScopedClasses['kanban-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['kanban-column']} */ ;
/** @type {__VLS_StyleScopedClasses['kanban-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['kanban-card']} */ ;
/** @type {__VLS_StyleScopedClasses['priority-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['add-task-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['inner-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-period']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['connection-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['content-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['reminder-page-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-count']} */ ;
/** @type {__VLS_StyleScopedClasses['reminder-page-row']} */ ;
/** @type {__VLS_StyleScopedClasses['reminder-done']} */ ;
/** @type {__VLS_StyleScopedClasses['task-check']} */ ;
/** @type {__VLS_StyleScopedClasses['task-check-done']} */ ;
/** @type {__VLS_StyleScopedClasses['reminder-marker']} */ ;
/** @type {__VLS_StyleScopedClasses['completed-label']} */ ;
/** @type {__VLS_StyleScopedClasses['quiet-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['reminder-note']} */ ;
/** @type {__VLS_StyleScopedClasses['inner-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-period']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['connection-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['content-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['muted-count']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sender-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-status']} */ ;
/** @type {__VLS_StyleScopedClasses['reply-needed']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['followup-aside']} */ ;
/** @type {__VLS_StyleScopedClasses['aside-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['inner-page']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-period']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['connection-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['unavailable']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-welcome']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-orb']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-input']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-disclaimer']} */ ;
/** @type {__VLS_StyleScopedClasses['inner-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-period']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['connection-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['unavailable']} */ ;
/** @type {__VLS_StyleScopedClasses['content-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['knowledge-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['knowledge-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['button-outline']} */ ;
/** @type {__VLS_StyleScopedClasses['privacy-line']} */ ;
/** @type {__VLS_StyleScopedClasses['inner-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-period']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['integration-notice']} */ ;
/** @type {__VLS_StyleScopedClasses['integration-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['integration-card']} */ ;
/** @type {__VLS_StyleScopedClasses['integration-brand']} */ ;
/** @type {__VLS_StyleScopedClasses['integration-status']} */ ;
/** @type {__VLS_StyleScopedClasses['button-outline']} */ ;
/** @type {__VLS_StyleScopedClasses['whatsapp-note']} */ ;
/** @type {__VLS_StyleScopedClasses['inner-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-period']} */ ;
/** @type {__VLS_StyleScopedClasses['heading-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['content-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-section']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-value']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-section']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-value']} */ ;
/** @type {__VLS_StyleScopedClasses['plain-value']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-section']} */ ;
/** @type {__VLS_StyleScopedClasses['privacy-status']} */ ;
/** @type {__VLS_StyleScopedClasses['settings-section']} */ ;
/** @type {__VLS_StyleScopedClasses['reset-section']} */ ;
/** @type {__VLS_StyleScopedClasses['button-outline']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-bottom-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-active']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-active']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['task-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-kicker']} */ ;
/** @type {__VLS_StyleScopedClasses['quiet-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['optional-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['button-outline']} */ ;
/** @type {__VLS_StyleScopedClasses['button-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            Archive: Archive,
            ArrowUpRight: ArrowUpRight,
            Bell: Bell,
            BookOpen: BookOpen,
            CalendarDays: CalendarDays,
            Check: Check,
            CheckCircle2: CheckCircle2,
            ChevronDown: ChevronDown,
            ChevronRight: ChevronRight,
            Clock3: Clock3,
            Filter: Filter,
            Inbox: Inbox,
            ListTodo: ListTodo,
            Mail: Mail,
            Menu: Menu,
            MessageCircle: MessageCircle,
            MoreHorizontal: MoreHorizontal,
            Plus: Plus,
            Search: Search,
            Send: Send,
            ShieldCheck: ShieldCheck,
            Sparkles: Sparkles,
            Star: Star,
            X: X,
            workspace: workspace,
            activeSection: activeSection,
            searchQuery: searchQuery,
            inboxFilter: inboxFilter,
            taskView: taskView,
            selectedMessageId: selectedMessageId,
            taskDialogOpen: taskDialogOpen,
            taskTitle: taskTitle,
            taskDetail: taskDetail,
            taskDueDate: taskDueDate,
            taskPriority: taskPriority,
            mobileMenuOpen: mobileMenuOpen,
            primaryNavigation: primaryNavigation,
            secondaryNavigation: secondaryNavigation,
            todayLabel: todayLabel,
            greeting: greeting,
            openTasks: openTasks,
            todayTasks: todayTasks,
            importantMessages: importantMessages,
            inboxMessages: inboxMessages,
            visibleTasks: visibleTasks,
            selectedMessage: selectedMessage,
            pendingReplies: pendingReplies,
            activeReminders: activeReminders,
            pageTitle: pageTitle,
            openTaskDialog: openTaskDialog,
            createTask: createTask,
            openMessage: openMessage,
            archiveSelectedMessage: archiveSelectedMessage,
            sourceIcon: sourceIcon,
            sourceClass: sourceClass,
            priorityLabel: priorityLabel,
            relativeTime: relativeTime,
            formatDueDate: formatDueDate,
            navigateTo: navigateTo,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
