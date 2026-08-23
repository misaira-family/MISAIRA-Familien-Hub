/* =========================================================
   MISAIRA FAMILIEN HUB
   SUPABASE EDITION 5.0.0
   =========================================================

   SYSTEM:

   WELCOME
      ↓
   LOGIN / REGISTER
      ↓
   SUPABASE AUTH
      ↓
   SUPABASE FAMILY
      ↓
   LOADER
      ↓
   MISAIRA FAMILIEN HUB

   DATEN:
   - Auth                 → Supabase Auth
   - Profil               → profiles
   - Familie              → families
   - Familienmitglieder   → family_members
   - Einstellungen        → family_settings
   - Kalender             → calendar_events
   - Termine              → appointments
   - Aufgaben             → tasks
   - Einkaufsliste        → shopping_items
   - Chat                 → chat_messages
   - Dokumente            → documents
   - Fotos                → photos
   - Finanzen             → finance_transactions
   - Benachrichtigungen   → notifications
   - Support              → support_requests
   - Jahrestage            → anniversaries

   KEIN localStorage als Datenbank.
========================================================= */

"use strict";


/* =========================================================
   CONFIG
========================================================= */

const MISAIRA_CONFIG = {

    version: "5.0.0",

    welcomeDuration: 10000,

    loaderDuration: 8000,

    supabaseUrl:
        "https://tjxnkqanzodhijushntf.supabase.co",

    supabasePublishableKey:
        "sb_publishable_LdbqnZGpFjHQGPxEk3G3FQ_QBUD_aBw"

};


/* =========================================================
   SUPABASE CLIENT
========================================================= */

if (
    typeof window.supabase === "undefined"
) {

    throw new Error(
        "MISAIRA: Supabase-Bibliothek wurde nicht geladen. " +
        "Bitte Supabase vor script.js einbinden."
    );

}


const supabaseClient =
    window.supabase.createClient(
        MISAIRA_CONFIG.supabaseUrl,
        MISAIRA_CONFIG.supabasePublishableKey
    );


console.log(
    "MISAIRA: Supabase Client gestartet."
);


/* =========================================================
   GLOBAL STATE
========================================================= */

let state =
    createDefaultState();


let welcomeTimer =
    null;


let loaderTimer =
    null;


let authSubscription =
    null;


/* =========================================================
   DOM HELPER
========================================================= */

function $(selector) {

    return document.querySelector(
        selector
    );

}


function $all(selector) {

    return Array.from(
        document.querySelectorAll(
            selector
        )
    );

}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================================================
   DEFAULT STATE
========================================================= */

function createDefaultState() {

    return {

        loggedIn: false,

        session: null,

        user: {

            id: "",

            name: "Familie",

            email: "",

            avatar_url: "",

            family_id: ""

        },

        family: {

            id: "",

            name: "Meine Familie",

            family_code: ""

        },

        settings: {

            notifications: true,

            appointmentNotifications: true,

            chatNotifications: true,

            sound: true,

            sounds: true,

            voice: true,

            glow: true,

            animations: true,

            sync: true,

            security: true,

            language: "de"

        },

        appointments: [],

        calendar: [],

        tasks: [],

        shopping: [],

        chat: [],

        documents: [],

        finances: [],

        photos: [],

        familyMembers: [],

        notifications: [],

        support: [],

        anniversaries: [],

        anniversary: ""

    };

}


/* =========================================================
   NO LOCAL DATABASE
========================================================= */

function saveState() {

    /*
     * Bewusst leer.
     *
     * MISAIRA speichert die Daten nicht mehr
     * im localStorage.
     *
     * Die Daten werden direkt in Supabase
     * gespeichert.
     */

    return true;

}


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initMISAIRA
);


async function initMISAIRA() {

    console.log(
        "MISAIRA 5.0.0 wird gestartet..."
    );


    initializeWelcome();

    initializeAuth();

    initializeSidebar();

    initializeNavigation();

    initializeSettings();

    initializeGlobalButtons();

    initializeSearch();

    initializeNotifications();

    initializeMobileNavigation();


    applySettings();


    await initializeSupabaseAuth();

}


/* =========================================================
   SUPABASE AUTH INITIALIZATION
========================================================= */

async function initializeSupabaseAuth() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "MISAIRA Auth Session Fehler:",
                error
            );

            showAuth();

            return;

        }


        if (
            data &&
            data.session
        ) {

            console.log(
                "MISAIRA: Bestehende Supabase-Session gefunden."
            );


            await handleAuthenticatedSession(
                data.session
            );

        } else {

            console.log(
                "MISAIRA: Keine aktive Session."
            );


            showAuth();

        }


        if (
            authSubscription
        ) {

            authSubscription.unsubscribe();

        }


        const result =
            supabaseClient.auth.onAuthStateChange(
                async (
                    event,
                    session
                ) => {

                    console.log(
                        "MISAIRA Auth Event:",
                        event
                    );


                    if (
                        session
                    ) {

                        await handleAuthenticatedSession(
                            session
                        );

                    } else {

                        state =
                            createDefaultState();

                        showAuth();

                    }

                }
            );


        authSubscription =
            result.data.subscription;


    } catch (error) {

        console.error(
            "MISAIRA Auth Initialisierung:",
            error
        );


        showAuth();

    }

}


/* =========================================================
   AUTHENTICATED SESSION
========================================================= */

async function handleAuthenticatedSession(
    session
) {

    if (!session || !session.user) {

        showAuth();

        return;

    }


    state.session =
        session;


    state.loggedIn =
        true;


    state.user.id =
        session.user.id;


    state.user.email =
        session.user.email || "";


    const metadata =
        session.user.user_metadata || {};


    state.user.name =
        metadata.name ||
        state.user.email.split("@")[0] ||
        "Familie";


    try {

        await ensureMyFamily();

        await loadUserProfile();

        await loadFamily();

        await loadAllFamilyData();


        updateUserInterface();


        /*
         * Wenn die App bereits offen ist,
         * nicht erneut den Loader anzeigen.
         */

        if (
            $("#appScreen") &&
            !$("#appScreen").classList.contains(
                "hidden"
            )
        ) {

            return;

        }


        startLoader();

    } catch (error) {

        console.error(
            "MISAIRA: Familiendaten konnten nicht geladen werden.",
            error
        );


        showMessage(
            "#authMessage",
            "MISAIRA konnte deine Familiendaten nicht laden.",
            "error"
        );

    }

}


/* =========================================================
   ENSURE FAMILY
========================================================= */

async function ensureMyFamily() {

    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            "ensure_my_family"
        );


    if (error) {

        console.error(
            "MISAIRA ensure_my_family:",
            error
        );

        throw error;

    }


    state.user.family_id =
        data || "";


    console.log(
        "MISAIRA Family ID:",
        state.user.family_id
    );

}


/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadUserProfile() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "id,name,email,avatar_url,family_id"
            )
            .eq(
                "id",
                state.user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "MISAIRA Profil:",
            error
        );

        throw error;

    }


    if (data) {

        state.user = {

            id:
                data.id,

            name:
                data.name ||
                state.user.name,

            email:
                data.email ||
                state.user.email,

            avatar_url:
                data.avatar_url || "",

            family_id:
                data.family_id ||
                state.user.family_id

        };

    }

}


/* =========================================================
   LOAD FAMILY
========================================================= */

async function loadFamily() {

    if (
        !state.user.family_id
    ) {

        return;

    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("families")
            .select(
                "id,name,family_code"
            )
            .eq(
                "id",
                state.user.family_id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "MISAIRA Familie:",
            error
        );

        throw error;

    }


    if (data) {

        state.family = {

            id:
                data.id,

            name:
                data.name,

            family_code:
                data.family_code || ""

        };

    }


    await loadFamilyMembers();

}


/* =========================================================
   FAMILY MEMBERS
========================================================= */

async function loadFamilyMembers() {

    if (
        !state.user.family_id
    ) {

        return;

    }


    const {
        data: members,
        error
    } =
        await supabaseClient
            .from("family_members")
            .select(
                "id,user_id,role,joined_at"
            )
            .eq(
                "family_id",
                state.user.family_id
            )
            .order(
                "joined_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "MISAIRA Familienmitglieder:",
            error
        );

        return;

    }


    state.familyMembers =
        [];


    for (
        const member of
        members || []
    ) {

        const {
            data: profile
        } =
            await supabaseClient
                .from("profiles")
                .select(
                    "id,name,email,avatar_url"
                )
                .eq(
                    "id",
                    member.user_id
                )
                .maybeSingle();


        state.familyMembers.push({

            id:
                member.id,

            user_id:
                member.user_id,

            role:
                member.role,

            joined_at:
                member.joined_at,

            name:
                profile?.name ||
                "Familienmitglied",

            email:
                profile?.email ||
                "",

            avatar_url:
                profile?.avatar_url ||
                ""

        });

    }

}


/* =========================================================
   LOAD ALL DATA
========================================================= */

async function loadAllFamilyData() {

    if (
        !state.user.family_id
    ) {

        return;

    }


    await Promise.all([

        loadAppointments(),

        loadCalendar(),

        loadTasks(),

        loadShopping(),

        loadChat(),

        loadDocuments(),

        loadFinances(),

        loadPhotos(),

        loadNotifications(),

        loadSettings(),

        loadSupport(),

        loadAnniversaries()

    ]);

}


/* =========================================================
   LOAD APPOINTMENTS
========================================================= */

async function loadAppointments() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("appointments")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .order(
                "start_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "MISAIRA Termine:",
            error
        );

        return;

    }


    state.appointments =
        (data || []).map(
            item => ({

                id:
                    item.id,

                title:
                    item.title,

                description:
                    item.description || "",

                location:
                    item.location || "",

                date:
                    item.start_at,

                start_at:
                    item.start_at,

                end_at:
                    item.end_at,

                all_day:
                    item.all_day,

                color:
                    item.color

            })
        );

}


/* =========================================================
   LOAD CALENDAR
========================================================= */

async function loadCalendar() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("calendar_events")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .order(
                "event_date",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "MISAIRA Kalender:",
            error
        );

        return;

    }


    state.calendar =
        data || [];

}


/* =========================================================
   LOAD TASKS
========================================================= */

async function loadTasks() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("tasks")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "MISAIRA Aufgaben:",
            error
        );

        return;

    }


    state.tasks =
        (data || []).map(
            item => ({

                id:
                    item.id,

                title:
                    item.title,

                description:
                    item.description || "",

                done:
                    item.completed,

                completed:
                    item.completed,

                due_at:
                    item.due_at

            })
        );

}


/* =========================================================
   LOAD SHOPPING
========================================================= */

async function loadShopping() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("shopping_items")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "MISAIRA Einkaufsliste:",
            error
        );

        return;

    }


    state.shopping =
        (data || []).map(
            item => ({

                id:
                    item.id,

                title:
                    item.name,

                name:
                    item.name,

                done:
                    item.completed,

                completed:
                    item.completed,

                quantity:
                    item.quantity,

                unit:
                    item.unit,

                category:
                    item.category

            })
        );

}


/* =========================================================
   LOAD CHAT
========================================================= */

async function loadChat() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("chat_messages")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "MISAIRA Chat:",
            error
        );

        return;

    }


    state.chat =
        (data || []).map(
            item => ({

                id:
                    item.id,

                user_id:
                    item.user_id,

                sender:
                    item.user_id ===
                    state.user.id
                        ? state.user.name
                        : "Familienmitglied",

                message:
                    item.message,

                time:
                    item.created_at

            })
        );

}


/* =========================================================
   LOAD DOCUMENTS
========================================================= */

async function loadDocuments() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("documents")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "MISAIRA Dokumente:",
            error
        );

        return;

    }


    state.documents =
        (data || []).map(
            item => ({

                id:
                    item.id,

                title:
                    item.name,

                name:
                    item.name,

                file_url:
                    item.file_url,

                created:
                    item.created_at

            })
        );

}


/* =========================================================
   LOAD FINANCES
========================================================= */

async function loadFinances() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("finance_transactions")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .order(
                "transaction_date",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "MISAIRA Finanzen:",
            error
        );

        return;

    }


    state.finances =
        (data || []).map(
            item => ({

                id:
                    item.id,

                title:
                    item.title,

                amount:
                    Number(
                        item.amount
                    ),

                type:
                    item.type,

                category:
                    item.category,

                date:
                    item.transaction_date

            })
        );

}


/* =========================================================
   LOAD PHOTOS
========================================================= */

async function loadPhotos() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("photos")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "MISAIRA Fotos:",
            error
        );

        return;

    }


    state.photos =
        (data || []).map(
            item => ({

                id:
                    item.id,

                title:
                    item.title || "Familienfoto",

                url:
                    item.file_url,

                description:
                    item.description || ""

            })
        );

}


/* =========================================================
   LOAD NOTIFICATIONS
========================================================= */

async function loadNotifications() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("notifications")
            .select("*")
            .eq(
                "user_id",
                state.user.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "MISAIRA Benachrichtigungen:",
            error
        );

        return;

    }


    state.notifications =
        (data || []).map(
            item => ({

                id:
                    item.id,

                title:
                    item.title,

                text:
                    item.message,

                read:
                    item.read,

                created_at:
                    item.created_at

            })
        );

}


/* =========================================================
   LOAD SETTINGS
========================================================= */

async function loadSettings() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("family_settings")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "MISAIRA Einstellungen:",
            error
        );

        return;

    }


    if (!data) {

        return;

    }


    state.settings.notifications =
        data.notifications_enabled;

    state.settings.sound =
        data.sounds_enabled;

    state.settings.sounds =
        data.sounds_enabled;

    state.settings.voice =
        data.voice_enabled;

    state.settings.language =
        data.language || "de";

}


/* =========================================================
   LOAD SUPPORT
========================================================= */

async function loadSupport() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("support_requests")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .eq(
                "user_id",
                state.user.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "MISAIRA Support:",
            error
        );

        return;

    }


    state.support =
        data || [];

}


/* =========================================================
   LOAD ANNIVERSARIES
========================================================= */

async function loadAnniversaries() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("anniversaries")
            .select("*")
            .eq(
                "family_id",
                state.user.family_id
            )
            .order(
                "anniversary_date",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "MISAIRA Jahrestage:",
            error
        );

        return;

    }


    state.anniversaries =
        data || [];


    if (
        state.anniversaries.length
    ) {

        state.anniversary =
            state.anniversaries[0]
                .anniversary_date;

    }

}


/* =========================================================
   WELCOME
========================================================= */

function initializeWelcome() {

    const welcome =
        $("#welcomeScreen");

    const auth =
        $("#authScreen");

    const loader =
        $("#loaderScreen");

    const app =
        $("#appScreen");


    if (!welcome) {

        showAuth();

        return;

    }


    welcome.classList.remove(
        "hidden"
    );


    auth?.classList.add(
        "hidden"
    );

    loader?.classList.add(
        "hidden"
    );

    app?.classList.add(
        "hidden"
    );


    clearTimeout(
        welcomeTimer
    );


    welcomeTimer =
        setTimeout(
            () => {

                showAuth();

            },
            MISAIRA_CONFIG.welcomeDuration
        );

}


/* =========================================================
   AUTH SCREEN
========================================================= */

function showAuth() {

    $("#welcomeScreen")
        ?.classList.add(
            "hidden"
        );

    $("#loaderScreen")
        ?.classList.add(
            "hidden"
        );

    $("#appScreen")
        ?.classList.add(
            "hidden"
        );

    $("#authScreen")
        ?.classList.remove(
            "hidden"
        );


    showLoginForm();

}


/* =========================================================
   AUTH INITIALIZATION
========================================================= */

function initializeAuth() {

    $("#loginTab")
        ?.addEventListener(
            "click",
            showLoginForm
        );


    $("#registerTab")
        ?.addEventListener(
            "click",
            showRegisterForm
        );


    $("#openRegister")
        ?.addEventListener(
            "click",
            showRegisterForm
        );


    $("#backToLogin")
        ?.addEventListener(
            "click",
            showLoginForm
        );


    $("#familyCodeButton")
        ?.addEventListener(
            "click",
            showFamilyCodeForm
        );


    $("#backFromFamilyCode")
        ?.addEventListener(
            "click",
            showLoginForm
        );


    $("#forgotPassword")
        ?.addEventListener(
            "click",
            handleForgotPassword
        );


    $("#loginForm")
        ?.addEventListener(
            "submit",
            handleLogin
        );


    $("#registerForm")
        ?.addEventListener(
            "submit",
            handleRegister
        );


    $("#familyCodeForm")
        ?.addEventListener(
            "submit",
            handleFamilyCodeLogin
        );


    $all(
        ".password-toggle"
    ).forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        button.dataset
                            .passwordTarget;


                    const input =
                        document.getElementById(
                            target
                        );


                    if (!input) {

                        return;

                    }


                    input.type =
                        input.type ===
                        "password"
                            ? "text"
                            : "password";


                    button.textContent =
                        input.type ===
                        "password"
                            ? "◉"
                            : "◌";

                }
            );

        }
    );

}


/* =========================================================
   LOGIN FORM
========================================================= */

function showLoginForm() {

    $("#loginTab")
        ?.classList.add(
            "active"
        );

    $("#registerTab")
        ?.classList.remove(
            "active"
        );

    $("#loginForm")
        ?.classList.add(
            "active"
        );

    $("#registerForm")
        ?.classList.remove(
            "active"
        );

    $("#familyCodeForm")
        ?.classList.remove(
            "active"
        );


    clearAuthMessages();

}


/* =========================================================
   REGISTER FORM
========================================================= */

function showRegisterForm() {

    $("#loginTab")
        ?.classList.remove(
            "active"
        );

    $("#registerTab")
        ?.classList.add(
            "active"
        );

    $("#loginForm")
        ?.classList.remove(
            "active"
        );

    $("#registerForm")
        ?.classList.add(
            "active"
        );

    $("#familyCodeForm")
        ?.classList.remove(
            "active"
        );


    clearAuthMessages();

}


/* =========================================================
   FAMILY CODE
========================================================= */

function showFamilyCodeForm() {

    $("#loginTab")
        ?.classList.remove(
            "active"
        );

    $("#registerTab")
        ?.classList.remove(
            "active"
        );

    $("#loginForm")
        ?.classList.remove(
            "active"
        );

    $("#registerForm")
        ?.classList.remove(
            "active"
        );

    $("#familyCodeForm")
        ?.classList.add(
            "active"
        );


    clearAuthMessages();


    $("#familyCode")
        ?.focus();

}


/* =========================================================
   AUTH MESSAGES
========================================================= */

function clearAuthMessages() {

    [
        "#authMessage",
        "#registerMessage",
        "#familyCodeMessage"

    ].forEach(
        selector => {

            const element =
                $(selector);


            if (!element) {

                return;

            }


            element.textContent =
                "";


            element.classList.remove(
                "error",
                "success",
                "info"
            );

        }
    );

}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {

    event.preventDefault();


    console.log(
        "MISAIRA: LOGIN wurde gedrückt."
    );


    const email =
        $("#loginEmail")
            ?.value
            .trim();


    const password =
        $("#loginPassword")
            ?.value;


    if (
        !email ||
        !password
    ) {

        showMessage(
            "#authMessage",
            "Bitte E-Mail und Passwort eingeben.",
            "error"
        );

        return;

    }


    showMessage(
        "#authMessage",
        "Verbindung mit MISAIRA wird hergestellt...",
        "info"
    );


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.signInWithPassword({

                email,

                password

            });


        if (error) {

            console.error(
                "MISAIRA LOGIN:",
                error
            );


            showMessage(
                "#authMessage",
                translateAuthError(
                    error.message
                ),
                "error"
            );

            return;

        }


        console.log(
            "MISAIRA: Supabase Login erfolgreich."
        );


        state.session =
            data.session;


        state.loggedIn =
            true;


        showMessage(
            "#authMessage",
            "Anmeldung erfolgreich.",
            "success"
        );


        await handleAuthenticatedSession(
            data.session
        );


    } catch (error) {

        console.error(
            "MISAIRA Login Exception:",
            error
        );


        showMessage(
            "#authMessage",
            "Verbindung zu MISAIRA konnte nicht hergestellt werden.",
            "error"
        );

    }

}


/* =========================================================
   REGISTER
========================================================= */

async function handleRegister(event) {

    event.preventDefault();


    const name =
        $("#registerName")
            ?.value
            .trim();


    const email =
        $("#registerEmail")
            ?.value
            .trim();


    const password =
        $("#registerPassword")
            ?.value;


    const confirm =
        $("#registerPasswordConfirm")
            ?.value;


    const terms =
        $("#registerTerms")
            ?.checked;


    if (
        !name ||
        !email ||
        !password
    ) {

        showMessage(
            "#registerMessage",
            "Bitte alle Felder ausfüllen.",
            "error"
        );

        return;

    }


    if (
        password.length < 8
    ) {

        showMessage(
            "#registerMessage",
            "Das Passwort muss mindestens 8 Zeichen enthalten.",
            "error"
        );

        return;

    }


    if (
        password !== confirm
    ) {

        showMessage(
            "#registerMessage",
            "Die Passwörter stimmen nicht überein.",
            "error"
        );

        return;

    }


    if (
        !terms
    ) {

        showMessage(
            "#registerMessage",
            "Bitte akzeptiere die Nutzungsbedingungen.",
            "error"
        );

        return;

    }


    showMessage(
        "#registerMessage",
        "Konto wird direkt in Supabase erstellt...",
        "info"
    );


    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.signUp({

                email,

                password,

                options: {

                    data: {

                        name,

                        family_name:
                            name + " Familie"

                    }

                }

            });


        if (error) {

            console.error(
                "MISAIRA REGISTER:",
                error
            );


            showMessage(
                "#registerMessage",
                translateAuthError(
                    error.message
                ),
                "error"
            );

            return;

        }


        console.log(
            "MISAIRA: Registrierung erfolgreich.",
            data
        );


        /*
         * Wenn E-Mail-Bestätigung aktiviert ist,
         * gibt Supabase noch keine Session zurück.
         */

        if (
            !data.session
        ) {

            showMessage(
                "#registerMessage",
                "Konto wurde erstellt. Bitte bestätige deine E-Mail-Adresse und melde dich danach an.",
                "success"
            );


            setTimeout(
                () => {

                    showLoginForm();

                    if (
                        $("#loginEmail")
                    ) {

                        $("#loginEmail").value =
                            email;

                    }

                },
                1800
            );


            return;

        }


        showMessage(
            "#registerMessage",
            "Konto erfolgreich erstellt.",
            "success"
        );


        await handleAuthenticatedSession(
            data.session
        );


    } catch (error) {

        console.error(
            "MISAIRA Registrierung:",
            error
        );


        showMessage(
            "#registerMessage",
            "Registrierung konnte nicht abgeschlossen werden.",
            "error"
        );

    }

}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

async function handleForgotPassword() {

    const email =
        $("#loginEmail")
            ?.value
            .trim();


    if (!email) {

        showMessage(
            "#authMessage",
            "Bitte zuerst deine E-Mail-Adresse eingeben.",
            "error"
        );

        return;

    }


    try {

        const {
            error
        } =
            await supabaseClient.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo:
                        window.location.origin +
                        window.location.pathname
                }
            );


        if (error) {

            showMessage(
                "#authMessage",
                translateAuthError(
                    error.message
                ),
                "error"
            );

            return;

        }


        showMessage(
            "#authMessage",
            "Ein Link zum Zurücksetzen des Passworts wurde an deine E-Mail gesendet.",
            "success"
        );

    } catch (error) {

        console.error(
            error
        );

    }

}


/* =========================================================
   FAMILY CODE LOGIN
========================================================= */

async function handleFamilyCodeLogin() {

    const input =
        document.getElementById("familyCodeInput");

    const code =
        input
            ? input.value.trim().toUpperCase()
            : "";

    if (!code) {

        alert(
            "Bitte gib deinen Familien-Code ein."
        );

        return;

    }


    if (code.length < 6) {

        alert(
            "Der Familien-Code muss mindestens 6 Zeichen haben."
        );

        return;

    }


    try {

        /* =========================================
           AKTUELL ANGEMELDETEN BENUTZER PRÜFEN
        ========================================== */

        const {
            data: {
                user
            },
            error:
                sessionError
        } =
            await supabaseClient
                .auth
                .getUser();


        if (
            sessionError ||
            !user
        ) {

            alert(
                "Bitte melde dich zuerst mit deinem Konto an."
            );

            return;

        }


        /* =========================================
           FAMILIEN-CODE PRÜFEN
        ========================================== */

        const {
            data:
                family,
            error:
                joinError
        } =
            await supabaseClient
                .rpc(
                    "join_family_by_code",
                    {
                        p_family_code:
                            code
                    }
                );


        if (joinError) {

            console.error(
                "MISAIRA Familien-Code:",
                joinError
            );


            const message =
                String(
                    joinError.message ||
                    ""
                );


            if (
                message.includes(
                    "FAMILY_NOT_FOUND"
                )
            ) {

                alert(
                    "Dieser Familien-Code wurde nicht gefunden."
                );

            }
            else if (
                message.includes(
                    "ALREADY_IN_FAMILY"
                )
            ) {

                alert(
                    "Du bist bereits mit einer anderen Familie verbunden."
                );

            }
            else {

                alert(
                    "Der Familien-Code konnte nicht verarbeitet werden."
                );

            }

            return;

        }


        if (!family) {

            alert(
                "Die Familie konnte nicht gefunden werden."
            );

            return;

        }


        /* =========================================
           LOKALEN STATUS AKTUALISIEREN
        ========================================== */

        if (
            typeof state !==
            "undefined"
        ) {

            state.family =
                family;

            state.user =
                state.user || {};

            state.user.family_id =
                family.id;

        }


        /* =========================================
           FAMILIE ERFOLGREICH VERBUNDEN
        ========================================== */

        alert(
            "Familien-Code erfolgreich bestätigt!\n\n" +
            "Du bist jetzt mit " +
            (
                family.name ||
                "deiner Familie"
            ) +
            " verbunden."
        );


        /* =========================================
           FAMILIEN-DATEN NEU LADEN
        ========================================== */

        try {

            if (
                typeof loadFamilyData ===
                "function"
            ) {

                await loadFamilyData();

            }

        }
        catch (
            familyLoadError
        ) {

            console.warn(
                "MISAIRA: Familien-Daten konnten nicht sofort neu geladen werden.",
                familyLoadError
            );

        }


        /* =========================================
           LOGIN / FAMILIEN-CODE-BEREICH SCHLIESSEN
        ========================================== */

        const familyCodeScreen =
            document.getElementById(
                "familyCodeScreen"
            );


        if (
            familyCodeScreen
        ) {

            familyCodeScreen.classList.add(
                "hidden"
            );

        }


        const loginScreen =
            document.getElementById(
                "loginScreen"
            );


        if (
            loginScreen
        ) {

            loginScreen.classList.add(
                "hidden"
            );

        }


        const app =
            document.getElementById(
                "app"
            );


        if (
            app
        ) {

            app.classList.remove(
                "hidden"
            );

        }


        console.log(
            "MISAIRA: Familie erfolgreich verbunden.",
            family
        );

    }
    catch (
        error
    ) {

        console.error(
            "MISAIRA Familien-Code Fehler:",
            error
        );


        alert(
            "Beim Verbinden mit der Familie ist ein Fehler aufgetreten."
        );

    }

               }


/* =========================================================
   AUTH ERROR TRANSLATION
========================================================= */

function translateAuthError(message) {

    const text =
        String(
            message || ""
        ).toLowerCase();


    if (
        text.includes(
            "invalid login credentials"
        )
    ) {

        return "E-Mail oder Passwort ist nicht korrekt.";

    }


    if (
        text.includes(
            "email not confirmed"
        )
    ) {

        return "Bitte bestätige zuerst deine E-Mail-Adresse.";

    }


    if (
        text.includes(
            "user already registered"
        )
    ) {

        return "Für diese E-Mail-Adresse existiert bereits ein Konto.";

    }


    if (
        text.includes(
            "password should be at least"
        )
    ) {

        return "Das Passwort ist zu kurz.";

    }


    if (
        text.includes(
            "invalid api key"
        )
    ) {

        return "Der Supabase API-Key ist ungültig.";

    }


    return message ||
        "Es ist ein Fehler bei der Anmeldung aufgetreten.";

}


/* =========================================================
   LOADER
========================================================= */

function startLoader() {

    clearInterval(
        loaderTimer
    );


    $("#welcomeScreen")
        ?.classList.add(
            "hidden"
        );

    $("#authScreen")
        ?.classList.add(
            "hidden"
        );

    $("#appScreen")
        ?.classList.add(
            "hidden"
        );

    $("#loaderScreen")
        ?.classList.remove(
            "hidden"
        );


    const bar =
        $("#progressBar");


    const percent =
        $("#loaderPercent");


    const phase =
        $("#loaderPhase") ||
        document.querySelector(
            ".loader-title"
        );


    const items =
        $all(
            ".boot-item"
        );


    items.forEach(
        item => {

            item.classList.remove(
                "online",
                "ready"
            );


            const status =
                item.querySelector(
                    ".boot-status"
                );


            if (status) {

                status.textContent =
                    "OFFLINE";

            }

        }
    );


    let progress =
        0;


    if (bar) {

        bar.style.width =
            "0%";

    }


    if (percent) {

        percent.textContent =
            "0%";

    }


    if (phase) {

        phase.textContent =
            "MISAIRA CORE WIRD GESTARTET";

    }


    const bootStages = [

        {
            progress: 20,
            text: "System-Check"
        },

        {
            progress: 40,
            text: "Datenverbindung"
        },

        {
            progress: 60,
            text: "Familienmodule"
        },

        {
            progress: 80,
            text: "Sicherheitsprotokolle"
        },

        {
            progress: 100,
            text: "MISAIRA Core"
        }

    ];


    const phases = [

        [0, "MISAIRA CORE WIRD GESTARTET"],

        [20, "SYSTEM-CHECK WIRD DURCHGEFÜHRT"],

        [40, "DATENVERBINDUNG WIRD HERGESTELLT"],

        [60, "FAMILIENMODULE WERDEN GELADEN"],

        [80, "SICHERHEITSPROTOKOLL WIRD INITIALISIERT"],

        [100, "MISAIRA CORE IST ONLINE"]

    ];


    loaderTimer =
        setInterval(
            () => {

                progress++;


                if (
                    progress > 100
                ) {

                    progress = 100;

                }


                if (percent) {

                    percent.textContent =
                        `${progress}%`;

                }


                if (bar) {

                    bar.style.width =
                        `${progress}%`;

                }


                let currentPhase =
                    phases[0];


                phases.forEach(
                    item => {

                        if (
                            progress >=
                            item[0]
                        ) {

                            currentPhase =
                                item;

                        }

                    }
                );


                if (phase) {

                    phase.textContent =
                        currentPhase[1];

                }


                items.forEach(
                    (
                        item,
                        index
                    ) => {

                        const stage =
                            bootStages[index];


                        if (!stage) {

                            return;

                        }


                        const status =
                            item.querySelector(
                                ".boot-status"
                            );


                        if (
                            progress >=
                            stage.progress
                        ) {

                            item.classList.add(
                                "online"
                            );


                            if (status) {

                                status.textContent =
                                    "ONLINE";

                            }

                        }

                    }
                );


                if (
                    progress >= 100
                ) {

                    clearInterval(
                        loaderTimer
                    );


                    setTimeout(
                        openApp,
                        700
                    );

                }

            },
            MISAIRA_CONFIG.loaderDuration / 100
        );

}


/* =========================================================
   OPEN APP
========================================================= */

function openApp() {

    $("#welcomeScreen")
        ?.classList.add(
            "hidden"
        );

    $("#authScreen")
        ?.classList.add(
            "hidden"
        );

    $("#loaderScreen")
        ?.classList.add(
            "hidden"
        );

    $("#appScreen")
        ?.classList.remove(
            "hidden"
        );


    updateUserInterface();


    showPage(
        "home"
    );

}


/* =========================================================
   SIDEBAR
========================================================= */

function getSidebar() {

    return (
        document.getElementById(
            "mainSidebar"
        ) ||
        document.querySelector(
            ".sidebar"
        )
    );

}


function getSidebarOverlay() {

    return document.getElementById(
        "sidebarOverlay"
    );

}


function getSidebarToggle() {

    return document.getElementById(
        "sidebarToggle"
    );

}


function openSidebar() {

    const sidebar =
        getSidebar();


    const overlay =
        getSidebarOverlay();


    const toggle =
        getSidebarToggle();


    if (!sidebar) {

        return;

    }


    sidebar.classList.add(
        "open"
    );


    sidebar.classList.add(
        "active"
    );


    overlay?.classList.add(
        "active"
    );


    overlay?.classList.add(
        "open"
    );


    toggle?.setAttribute(
        "aria-expanded",
        "true"
    );


    document.body.classList.add(
        "sidebar-open"
    );

}


function closeSidebar() {

    const sidebar =
        getSidebar();


    const overlay =
        getSidebarOverlay();


    const toggle =
        getSidebarToggle();


    sidebar?.classList.remove(
        "open"
    );


    sidebar?.classList.remove(
        "active"
    );


    overlay?.classList.remove(
        "active"
    );


    overlay?.classList.remove(
        "open"
    );


    toggle?.setAttribute(
        "aria-expanded",
        "false"
    );


    document.body.classList.remove(
        "sidebar-open"
    );

}


function toggleSidebar(event) {

    event?.preventDefault();

    event?.stopPropagation();


    const sidebar =
        getSidebar();


    if (!sidebar) {

        return;

    }


    if (
        sidebar.classList.contains(
            "open"
        )
    ) {

        closeSidebar();

    } else {

        openSidebar();

    }

}


window.toggleMISAIRASidebar =
    toggleSidebar;


function initializeSidebar() {

    const toggle =
        getSidebarToggle();


    const overlay =
        getSidebarOverlay();


    if (
        toggle &&
        !toggle.hasAttribute(
            "onclick"
        )
    ) {

        toggle.addEventListener(
            "click",
            toggleSidebar
        );

    }


    overlay?.addEventListener(
        "click",
        closeSidebar
    );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                closeSidebar();

            }

        }
    );


    closeSidebar();

}


/* =========================================================
   NAVIGATION
========================================================= */

function initializeNavigation() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-page]"
                );


            if (!button) {

                return;

            }


            if (
                button.hasAttribute(
                    "data-settings-page"
                )
            ) {

                return;

            }


            const page =
                button.dataset.page;


            if (!page) {

                return;

            }


            event.preventDefault();


            showPage(
                page
            );

        }
    );

}


function showPage(pageName) {

    const target =
        document.getElementById(
            `${pageName}Page`
        );


    if (!target) {

        console.warn(
            `MISAIRA: Seite ${pageName}Page nicht gefunden.`
        );

        return;

    }


    $all(".page")
        .forEach(
            page => {

                page.classList.remove(
                    "active"
                );

            }
        );


    target.classList.add(
        "active"
    );


    if (
        pageName !==
        "settings"
    ) {

        closeSettingsSubPage();

    }


    closeSidebar();


    $all(".nav-item")
        .forEach(
            item => {

                item.classList.toggle(
                    "active",
                    item.dataset.page ===
                    pageName
                );

            }
        );


    $all(
        ".mobile-nav [data-page]"
    )
    .forEach(
        item => {

            item.classList.toggle(
                "active",
                item.dataset.page ===
                pageName
            );

        }
    );


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    renderPage(
        pageName
    );

}


/* =========================================================
   PAGE RENDER
========================================================= */

function renderPage(pageName) {

    switch (
        pageName
    ) {

        case "home":

            renderHome();

            break;


        case "calendar":

            renderCalendar();

            break;


        case "appointments":

            renderAppointments();

            break;


        case "chat":

            renderChat();

            break;


        case "documents":

            renderDocuments();

            break;


        case "shopping":

            renderShopping();

            break;
          

          case "mealplan":

    renderMisairaMealPlan();

    break;
          

        case "finances":

            renderFinances();

            break;


        case "photos":

            renderPhotos();

            break;


        case "family":

            renderFamily();

            break;


        case "settings":

            renderSettings();

            break;


        case "help":

            renderHelp();

            break;


        case "support":

            renderSupport();

            break;


        case "anniversary":

            renderAnniversary();

            break;

    }

}


/* =========================================================
   USER INTERFACE
========================================================= */

function updateUserInterface() {

    const name =
        state.user.name ||
        "Familie";


    const heroName =
        $("#heroName");


    if (heroName) {

        heroName.textContent =
            name;

    }


    const profile =
        $("#profileButton");


    if (profile) {

        profile.textContent =
            name
                .charAt(0)
                .toUpperCase();

    }


    const familyCount =
        $("#familyMemberCount");


    if (familyCount) {

        familyCount.textContent =
            state.familyMembers.length;

    }


    const shoppingCount =
        $("#shoppingCount");


    if (shoppingCount) {

        shoppingCount.textContent =
            state.shopping.filter(
                item =>
                    !item.done
            ).length;

    }


    const chatCount =
        $("#chatMessageCount");


    if (chatCount) {

        chatCount.textContent =
            state.chat.length;

    }


    const taskCount =
        $("#taskCount");


    if (taskCount) {

        taskCount.textContent =
            state.tasks.filter(
                item =>
                    !item.done
            ).length;

    }


    updateFinanceBalance();

    updateToday();

}


/* =========================================================
   HOME
========================================================= */

function renderHome() {

    updateUserInterface();

    renderHomeAppointments();

    renderHomeTasks();

    renderHomePhotos();

}


function renderHomeAppointments() {

    const container =
        $("#homeAppointmentList");


    if (!container) {

        return;

    }


    const items =
        [...state.appointments]
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(a.date) -
                    new Date(b.date)
            )
            .slice(
                0,
                4
            );


    if (!items.length) {

        container.innerHTML = `

            <div class="appointment-row">

                <span class="row-dot"></span>

                <div class="row-content">

                    <strong>
                        Keine Termine
                    </strong>

                    <small>
                        Ihr habt noch keine Termine eingetragen.
                    </small>

                </div>

            </div>

        `;


        if (
            $("#nextAppointmentTime")
        ) {

            $("#nextAppointmentTime")
                .textContent =
                "--";

        }


        if (
            $("#nextAppointmentTitle")
        ) {

            $("#nextAppointmentTitle")
                .textContent =
                "Keine Termine";

        }


        return;

    }


    container.innerHTML =
        items
            .map(
                item => `

                    <div class="appointment-row">

                        <span class="row-dot"></span>

                        <div class="row-content">

                            <strong>
                                ${escapeHTML(item.title)}
                            </strong>

                            <small>
                                ${formatDateTime(item.date)}
                            </small>

                        </div>

                    </div>

                `
            )
            .join("");


    const next =
        items[0];


    if (
        $("#nextAppointmentTime")
    ) {

        $("#nextAppointmentTime")
            .textContent =
            formatTime(
                next.date
            );

    }


    if (
        $("#nextAppointmentTitle")
    ) {

        $("#nextAppointmentTitle")
            .textContent =
            next.title;

    }

}


function renderHomeTasks() {

    const container =
        $("#homeTodoList");


    if (!container) {

        return;

    }


    const tasks =
        state.tasks
            .filter(
                task =>
                    !task.done
            )
            .slice(
                0,
                5
            );


    if (!tasks.length) {

        container.innerHTML = `

            <div class="todo-row">

                <span class="row-dot"></span>

                <div class="row-content">

                    <strong>
                        Keine offenen Aufgaben
                    </strong>

                    <small>
                        Alles erledigt.
                    </small>

                </div>

            </div>

        `;

        return;

    }


    container.innerHTML =
        tasks
            .map(
                task => `

                    <div class="todo-row">

                        <span class="row-dot"></span>

                        <div class="row-content">

                            <strong>
                                ${escapeHTML(task.title)}
                            </strong>

                        </div>

                    </div>

                `
            )
            .join("");

}


function renderHomePhotos() {

    const container =
        $("#familyPhotoGrid");


    if (!container) {

        return;

    }


    const photos =
        state.photos.slice(
            0,
            3
        );


    if (!photos.length) {

        container.innerHTML = `

            <div class="photo-preview">
                Familie
            </div>

            <div class="photo-preview">
                Zusammen
            </div>

            <div class="photo-preview">
                Momente
            </div>

        `;

        return;

    }


    container.innerHTML =
        photos
            .map(
                photo => `

                    <div
                        class="photo-preview"
                        style="
                            background-image:url('${escapeHTML(photo.url)}');
                            background-size:cover;
                            background-position:center;
                        "
                    >
                        ${escapeHTML(photo.title)}
                    </div>

                `
            )
            .join("");

}


/* =========================================================
   CALENDAR
========================================================= */

function renderCalendar() {

    const container =
        $("#calendarContent");


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="glass-card">

            <div class="module-toolbar">

                <input
                    id="calendarTitle"
                    type="text"
                    placeholder="Terminname"
                >

                <input
                    id="calendarDate"
                    type="datetime-local"
                >

                <button
                    id="addCalendarEvent"
                    class="action-button"
                    type="button"
                >
                    + Termin
                </button>

            </div>

            <div
                id="calendarList"
                class="module-list"
            ></div>

        </div>

    `;


    $("#addCalendarEvent")
        ?.addEventListener(
            "click",
            addCalendarEvent
        );


    drawCalendarList();

}


async function addCalendarEvent() {

    const title =
        $("#calendarTitle")
            ?.value
            .trim();


    const date =
        $("#calendarDate")
            ?.value;


    if (
        !title ||
        !date
    ) {

        alert(
            "Bitte Terminname und Datum eingeben."
        );

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("appointments")
            .insert({

                family_id:
                    state.user.family_id,

                created_by:
                    state.user.id,

                title,

                start_at:
                    new Date(
                        date
                    ).toISOString()

            });


    if (error) {

        console.error(
            error
        );

        alert(
            "Termin konnte nicht gespeichert werden."
        );

        return;

    }


    await loadAppointments();

    renderCalendar();

    updateUserInterface();

}


function drawCalendarList() {

    const list =
        $("#calendarList");


    if (!list) {

        return;

    }


    const items =
        [...state.appointments]
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(a.date) -
                    new Date(b.date)
            );


    if (!items.length) {

        list.innerHTML = `

            <div class="module-item">
                Noch keine Termine vorhanden.
            </div>

        `;

        return;

    }


    list.innerHTML =
        items
            .map(
                item => `

                    <div class="module-item">

                        <div class="module-item-main">

                            <strong>
                                ${escapeHTML(item.title)}
                            </strong>

                            <small>
                                ${formatDateTime(item.date)}
                            </small>

                        </div>

                        <button
                            class="icon-button danger"
                            type="button"
                            data-delete-appointment="${item.id}"
                        >
                            ×
                        </button>

                    </div>

                `
            )
            .join("");


    $all(
        "[data-delete-appointment]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset
                            .deleteAppointment;


                    const {
                        error
                    } =
                        await supabaseClient
                            .from("appointments")
                            .delete()
                            .eq(
                                "id",
                                id
                            );


                    if (error) {

                        console.error(
                            error
                        );

                        return;

                    }


                    await loadAppointments();

                    renderCalendar();

                    updateUserInterface();

                }
            );

        }
    );

}


/* =========================================================
   TASKS
========================================================= */

function renderAppointments() {

    const container =
        $("#appointmentsContent");


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="glass-card">

            <div class="module-toolbar">

                <input
                    id="taskTitle"
                    type="text"
                    placeholder="Neue Aufgabe"
                >

                <button
                    id="addTask"
                    class="action-button"
                    type="button"
                >
                    + Aufgabe
                </button>

            </div>

            <div
                id="taskList"
                class="module-list"
            ></div>

        </div>


        <div class="glass-card">

            <div class="card-header">

                <div>

                    <span>TERMINE</span>

                    <h2>
                        Alle Termine
                    </h2>

                </div>

            </div>

            <div
                id="appointmentModuleList"
                class="module-list"
            ></div>

        </div>

    `;


    $("#addTask")
        ?.addEventListener(
            "click",
            addTask
        );


    drawTasks();

    drawAppointmentModule();

}


async function addTask() {

    const title =
        $("#taskTitle")
            ?.value
            .trim();


    if (!title) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("tasks")
            .insert({

                family_id:
                    state.user.family_id,

                created_by:
                    state.user.id,

                title,

                completed:
                    false

            });


    if (error) {

        console.error(
            error
        );

        return;

    }


    await loadTasks();

    renderAppointments();

    updateUserInterface();

}


function drawTasks() {

    const list =
        $("#taskList");


    if (!list) {

        return;

    }


    if (!state.tasks.length) {

        list.innerHTML = `

            <div class="module-item">
                Keine Aufgaben vorhanden.
            </div>

        `;

        return;

    }


    list.innerHTML =
        state.tasks
            .map(
                task => `

                    <div class="module-item">

                        <input
                            type="checkbox"
                            ${task.done ? "checked" : ""}
                            data-task-check="${task.id}"
                        >

                        <div class="module-item-main">

                            <strong>
                                ${escapeHTML(task.title)}
                            </strong>

                        </div>

                        <button
                            class="icon-button danger"
                            type="button"
                            data-task-delete="${task.id}"
                        >
                            ×
                        </button>

                    </div>

                `
            )
            .join("");


    $all(
        "[data-task-check]"
    )
    .forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                async () => {

                    const id =
                        checkbox.dataset
                            .taskCheck;


                    await supabaseClient
                        .from("tasks")
                        .update({

                            completed:
                                checkbox.checked

                        })
                        .eq(
                            "id",
                            id
                        );


                    await loadTasks();

                    updateUserInterface();

                    renderHomeTasks();

                }
            );

        }
    );


    $all(
        "[data-task-delete]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    await supabaseClient
                        .from("tasks")
                        .delete()
                        .eq(
                            "id",
                            button.dataset
                                .taskDelete
                        );


                    await loadTasks();

                    renderAppointments();

                    updateUserInterface();

                }
            );

        }
    );

}


function drawAppointmentModule() {

    const list =
        $("#appointmentModuleList");


    if (!list) {

        return;

    }


    if (!state.appointments.length) {

        list.innerHTML = `

            <div class="module-item">
                Keine Termine vorhanden.
            </div>

        `;

        return;

    }


    list.innerHTML =
        state.appointments
            .map(
                item => `

                    <div class="module-item">

                        <div class="module-item-main">

                            <strong>
                                ${escapeHTML(item.title)}
                            </strong>

                            <small>
                                ${formatDateTime(item.date)}
                            </small>

                        </div>

                        <button
                            class="icon-button danger"
                            type="button"
                            data-delete-appointment="${item.id}"
                        >
                            ×
                        </button>

                    </div>

                `
            )
            .join("");


    $all(
        "#appointmentModuleList [data-delete-appointment]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    await supabaseClient
                        .from("appointments")
                        .delete()
                        .eq(
                            "id",
                            button.dataset
                                .deleteAppointment
                        );


                    await loadAppointments();

                    renderAppointments();

                    updateUserInterface();

                }
            );

        }
    );

}


/* =========================================================
   SHOPPING
========================================================= */

function renderShopping() {

    const container =
        $("#shoppingContent");


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="glass-card">

            <div class="module-toolbar">

                <input
                    id="shoppingInput"
                    type="text"
                    placeholder="Artikel hinzufügen..."
                >

                <button
                    id="addShopping"
                    class="action-button"
                    type="button"
                >
                    + Hinzufügen
                </button>

            </div>

            <div
                id="shoppingList"
                class="module-list"
            ></div>

        </div>

    `;


    $("#addShopping")
        ?.addEventListener(
            "click",
            addShoppingItem
        );


    drawShopping();

}


async function addShoppingItem() {

    const title =
        $("#shoppingInput")
            ?.value
            .trim();


    if (!title) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("shopping_items")
            .insert({

                family_id:
                    state.user.family_id,

                created_by:
                    state.user.id,

                name:
                    title,

                completed:
                    false

            });


    if (error) {

        console.error(
            error
        );

        return;

    }


    await loadShopping();

    renderShopping();

    updateUserInterface();

}


function drawShopping() {

    const list =
        $("#shoppingList");


    if (!list) {

        return;

    }


    if (!state.shopping.length) {

        list.innerHTML = `

            <div class="module-item">
                Eure Einkaufsliste ist leer.
            </div>

        `;

        return;

    }


    list.innerHTML =
        state.shopping
            .map(
                item => `

                    <div class="module-item">

                        <input
                            type="checkbox"
                            ${item.done ? "checked" : ""}
                            data-shopping-check="${item.id}"
                        >

                        <div class="module-item-main">

                            <strong
                                style="${
                                    item.done
                                        ? "text-decoration:line-through;opacity:.5;"
                                        : ""
                                }"
                            >
                                ${escapeHTML(item.title)}
                            </strong>

                        </div>

                        <button
                            class="icon-button danger"
                            type="button"
                            data-shopping-delete="${item.id}"
                        >
                            ×
                        </button>

                    </div>

                `
            )
            .join("");


    $all(
        "[data-shopping-check]"
    )
    .forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                async () => {

                    await supabaseClient
                        .from("shopping_items")
                        .update({

                            completed:
                                checkbox.checked

                        })
                        .eq(
                            "id",
                            checkbox.dataset
                                .shoppingCheck
                        );


                    await loadShopping();

                    renderShopping();

                    updateUserInterface();

                }
            );

        }
    );


    $all(
        "[data-shopping-delete]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    await supabaseClient
                        .from("shopping_items")
                        .delete()
                        .eq(
                            "id",
                            button.dataset
                                .shoppingDelete
                        );


                    await loadShopping();

                    renderShopping();

                    updateUserInterface();

                }
            );

        }
    );

}


/* =========================================================
   CHAT
========================================================= */

function renderChat() {

    const container =
        $("#chatContent");


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="glass-card">

            <div
                id="chatMessages"
                class="module-list"
            ></div>

            <div class="module-toolbar">

                <input
                    id="chatInput"
                    type="text"
                    placeholder="Nachricht schreiben..."
                >

                <button
                    id="sendChat"
                    class="action-button"
                    type="button"
                >
                    SENDEN
                </button>

            </div>

        </div>

    `;


    $("#sendChat")
        ?.addEventListener(
            "click",
            sendChatMessage
        );


    $("#chatInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    sendChatMessage();

                }

            }
        );


    drawChat();

}


async function sendChatMessage() {

    const input =
        $("#chatInput");


    const message =
        input?.value
            .trim();


    if (!message) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("chat_messages")
            .insert({

                family_id:
                    state.user.family_id,

                user_id:
                    state.user.id,

                message

            });


    if (error) {

        console.error(
            error
        );

        return;

    }


    await loadChat();

    renderChat();

    updateUserInterface();

}


function drawChat() {

    const container =
        $("#chatMessages");


    if (!container) {

        return;

    }


    if (!state.chat.length) {

        container.innerHTML = `

            <div class="module-item">
                Noch keine Nachrichten.
            </div>

        `;

        return;

    }


    container.innerHTML =
        state.chat
            .map(
                item => `

                    <div class="module-item">

                        <div class="module-item-main">

                            <strong>
                                ${escapeHTML(item.sender)}
                            </strong>

                            <small>
                                ${escapeHTML(item.message)}
                            </small>

                        </div>

                        <small>
                            ${formatTime(item.time)}
                        </small>

                    </div>

                `
            )
            .join("");

}


/* =========================================================
   DOCUMENTS
========================================================= */

function renderDocuments() {

    const container =
        $("#documentsContent");


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="glass-card">

            <div class="module-toolbar">

                <input
                    id="documentTitle"
                    type="text"
                    placeholder="Dokumentname"
                >

                <button
                    id="addDocument"
                    class="action-button"
                    type="button"
                >
                    + Dokument
                </button>

            </div>

            <div
                id="documentList"
                class="module-list"
            ></div>

        </div>

    `;


    $("#addDocument")
        ?.addEventListener(
            "click",
            addDocument
        );


    drawDocuments();

}


async function addDocument() {

    const title =
        $("#documentTitle")
            ?.value
            .trim();


    if (!title) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("documents")
            .insert({

                family_id:
                    state.user.family_id,

                uploaded_by:
                    state.user.id,

                name:
                    title,

                file_url:
                    "about:blank",

                file_type:
                    "test"

            });


    if (error) {

        console.error(
            error
        );

        return;

    }


    await loadDocuments();

    renderDocuments();

}


function drawDocuments() {

    const list =
        $("#documentList");


    if (!list) {

        return;

    }


    if (!state.documents.length) {

        list.innerHTML = `

            <div class="module-item">
                Noch keine Dokumente vorhanden.
            </div>

        `;

        return;

    }


    list.innerHTML =
        state.documents
            .map(
                item => `

                    <div class="module-item">

                        <div class="module-item-main">

                            <strong>
                                📄 ${escapeHTML(item.title)}
                            </strong>

                            <small>
                                Angelegt:
                                ${formatDateTime(item.created)}
                            </small>

                        </div>

                        <button
                            class="icon-button danger"
                            type="button"
                            data-document-delete="${item.id}"
                        >
                            ×
                        </button>

                    </div>

                `
            )
            .join("");


    $all(
        "[data-document-delete]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    await supabaseClient
                        .from("documents")
                        .delete()
                        .eq(
                            "id",
                            button.dataset
                                .documentDelete
                        );


                    await loadDocuments();

                    renderDocuments();

                }
            );

        }
    );

}


/* =========================================================
   FINANCES
========================================================= */

function renderFinances() {

    const container =
        $("#financesContent");


    if (!container) {

        return;

    }


    const income =
        state.finances
            .filter(
                item =>
                    item.type ===
                    "income"
            )
            .reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.amount
                    ),
                0
            );


    const expense =
        state.finances
            .filter(
                item =>
                    item.type ===
                    "expense"
            )
            .reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.amount
                    ),
                0
            );


    const balance =
        income -
        expense;


    container.innerHTML = `

        <div class="finance-summary">

            <div class="finance-box balance">

                <span>
                    AKTUELLER SALDO
                </span>

                <strong>
                    ${formatMoney(balance)}
                </strong>

            </div>

            <div class="finance-box income">

                <span>
                    EINNAHMEN
                </span>

                <strong>
                    ${formatMoney(income)}
                </strong>

            </div>

            <div class="finance-box expense">

                <span>
                    AUSGABEN
                </span>

                <strong>
                    ${formatMoney(expense)}
                </strong>

            </div>

            <div class="finance-box month">

                <span>
                    BUCHUNGEN
                </span>

                <strong>
                    ${state.finances.length}
                </strong>

            </div>

        </div>


        <div class="glass-card">

            <span class="eyebrow">
                FINANZ ZENTRALE
            </span>

            <h2>
                Neue Buchung
            </h2>


            <div class="finance-form">

                <div class="input-group">

                    <label>
                        BESCHREIBUNG
                    </label>

                    <input
                        id="financeTitle"
                        type="text"
                        placeholder="z.B. Gehalt, Einkauf..."
                    >

                </div>


                <div class="input-group">

                    <label>
                        BETRAG
                    </label>

                    <input
                        id="financeAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                    >

                </div>


                <div class="input-group">

                    <label>
                        ART
                    </label>

                    <select id="financeType">

                        <option value="expense">
                            Ausgabe
                        </option>

                        <option value="income">
                            Einnahme
                        </option>

                    </select>

                </div>


                <div class="input-group">

                    <label>
                        KATEGORIE
                    </label>

                    <select id="financeCategory">

                        <option>
                            Allgemein
                        </option>

                        <option>
                            Wohnen
                        </option>

                        <option>
                            Lebensmittel
                        </option>

                        <option>
                            Auto
                        </option>

                        <option>
                            Familie
                        </option>

                        <option>
                            Freizeit
                        </option>

                        <option>
                            Gehalt
                        </option>

                        <option>
                            Sonstiges
                        </option>

                    </select>

                </div>


                <button
                    id="addFinance"
                    type="button"
                    class="primary-button"
                >
                    BUCHUNG SPEICHERN
                </button>

            </div>

        </div>


        <div class="glass-card">

            <div class="card-header">

                <div>

                    <span>
                        FINANZEN
                    </span>

                    <h2>
                        Buchungen
                    </h2>

                </div>

            </div>


            <div
                id="financeRows"
                class="module-list"
            ></div>

        </div>

    `;


    $("#addFinance")
        ?.addEventListener(
            "click",
            addFinanceEntry
        );


    drawFinanceRows();

}


async function addFinanceEntry() {

    const title =
        $("#financeTitle")
            ?.value
            .trim();


    const amount =
        Number(
            $("#financeAmount")
                ?.value
        );


    const type =
        $("#financeType")
            ?.value;


    const category =
        $("#financeCategory")
            ?.value ||
        "Sonstiges";


    if (
        !title ||
        !amount ||
        amount <= 0
    ) {

        alert(
            "Bitte Beschreibung und gültigen Betrag eingeben."
        );

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("finance_transactions")
            .insert({

                family_id:
                    state.user.family_id,

                created_by:
                    state.user.id,

                title,

                amount,

                type,

                category

            });


    if (error) {

        console.error(
            error
        );

        return;

    }


    await loadFinances();

    renderFinances();

    updateUserInterface();

}


function drawFinanceRows() {

    const rows =
        $("#financeRows");


    if (!rows) {

        return;

    }


    if (!state.finances.length) {

        rows.innerHTML = `

            <div class="module-item">
                Noch keine Finanzbuchungen vorhanden.
            </div>

        `;

        return;

    }


    rows.innerHTML =
        state.finances
            .map(
                item => `

                    <div class="module-item">

                        <div class="module-item-main">

                            <strong>
                                ${escapeHTML(item.title)}
                            </strong>

                            <small>
                                ${escapeHTML(item.category || "Sonstiges")}
                                ·
                                ${formatDateTime(item.date)}
                            </small>

                        </div>

                        <strong>

                            ${
                                item.type ===
                                "income"
                                    ? "+"
                                    : "-"
                            }

                            ${formatMoney(item.amount)}

                        </strong>

                        <button
                            type="button"
                            class="icon-button danger"
                            data-finance-delete="${item.id}"
                        >
                            ×
                        </button>

                    </div>

                `
            )
            .join("");


    $all(
        "[data-finance-delete]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    await supabaseClient
                        .from("finance_transactions")
                        .delete()
                        .eq(
                            "id",
                            button.dataset
                                .financeDelete
                        );


                    await loadFinances();

                    renderFinances();

                    updateUserInterface();

                }
            );

        }
    );

}


function updateFinanceBalance() {

    const income =
        state.finances
            .filter(
                item =>
                    item.type ===
                    "income"
            )
            .reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.amount
                    ),
                0
            );


    const expense =
        state.finances
            .filter(
                item =>
                    item.type ===
                    "expense"
            )
            .reduce(
                (
                    sum,
                    item
                ) =>
                    sum +
                    Number(
                        item.amount
                    ),
                0
            );


    const element =
        $("#financeBalance");


    if (element) {

        element.textContent =
            formatMoney(
                income -
                expense
            );

    }

}


/* =========================================================
   PHOTOS
========================================================= */

function renderPhotos() {

    const container =
        $("#photosContent");


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="glass-card">

            <span class="eyebrow">
                FAMILIENMOMENTE
            </span>

            <h2>
                Foto hinzufügen
            </h2>

            <div class="module-toolbar">

                <input
                    id="photoTitle"
                    type="text"
                    placeholder="Titel"
                >

                <input
                    id="photoUrl"
                    type="url"
                    placeholder="Bild-URL"
                >

                <button
                    id="addPhoto"
                    class="action-button"
                    type="button"
                >
                    + Foto
                </button>

            </div>

        </div>


        <div
            id="photoList"
            class="photo-preview-grid"
        ></div>

    `;


    $("#addPhoto")
        ?.addEventListener(
            "click",
            addPhoto
        );


    drawPhotos();

}


async function addPhoto() {

    const title =
        $("#photoTitle")
            ?.value
            .trim();


    const url =
        $("#photoUrl")
            ?.value
            .trim();


    if (
        !title ||
        !url
    ) {

        alert(
            "Bitte Titel und Bild-URL eingeben."
        );

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("photos")
            .insert({

                family_id:
                    state.user.family_id,

                uploaded_by:
                    state.user.id,

                title,

                file_url:
                    url

            });


    if (error) {

        console.error(
            error
        );

        return;

    }


    await loadPhotos();

    renderPhotos();

}


function drawPhotos() {

    const list =
        $("#photoList");


    if (!list) {

        return;

    }


    if (!state.photos.length) {

        list.innerHTML = `

            <div class="photo-preview">
                Noch keine Fotos
            </div>

        `;

        return;

    }


    list.innerHTML =
        state.photos
            .map(
                photo => `

                    <div
                        class="photo-preview"
                        style="
                            background-image:url('${escapeHTML(photo.url)}');
                            background-size:cover;
                            background-position:center;
                        "
                    >

                        <strong>
                            ${escapeHTML(photo.title)}
                        </strong>

                        <button
                            class="icon-button danger"
                            type="button"
                            data-photo-delete="${photo.id}"
                        >
                            ×
                        </button>

                    </div>

                `
            )
            .join("");


    $all(
        "[data-photo-delete]"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                async () => {

                    await supabaseClient
                        .from("photos")
                        .delete()
                        .eq(
                            "id",
                            button.dataset
                                .photoDelete
                        );


                    await loadPhotos();

                    renderPhotos();

                }
            );

        }
    );

}


/* =========================================================
   FAMILY
========================================================= */

function renderFamily() {

    const container =
        $("#familyContent");


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="glass-card">

            <span class="eyebrow">
                FAMILIE
            </span>

            <h2>
                ${escapeHTML(state.family.name)}
            </h2>

            <div class="info-box">

                <strong>
                    FAMILIEN-CODE
                </strong>

                <p>
                    ${escapeHTML(
                        state.family.family_code ||
                        "Noch kein Code"
                    )}
                </p>

            </div>

        </div>


        <div class="glass-card">

            <div
                id="familyList"
                class="module-list"
            ></div>

        </div>

    `;


    drawFamily();

}


function drawFamily() {

    const list =
        $("#familyList");


    if (!list) {

        return;

    }


    if (
        !state.familyMembers.length
    ) {

        list.innerHTML = `

            <div class="module-item">
                Noch keine Familienmitglieder vorhanden.
            </div>

        `;

        return;

    }


    list.innerHTML =
        state.familyMembers
            .map(
                member => `

                    <div class="module-item">

                        <div class="sidebar-logo">

                            ${escapeHTML(
                                member.name
                                    .charAt(0)
                                    .toUpperCase()
                            )}

                        </div>

                        <div class="module-item-main">

                            <strong>
                                ${escapeHTML(member.name)}
                            </strong>

                            <small>
                                ${escapeHTML(member.role)}
                            </small>

                        </div>

                    </div>

                `
            )
            .join("");

}


/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {

    closeSettingsSubPage();

}


function openSettingsSubPage(name) {

    const main =
        $("#settingsMain");


    const sub =
        $("#settingsSubPage");


    const content =
        $("#settingsDetailContent");


    if (
        !main ||
        !sub ||
        !content
    ) {

        return;

    }


    main.classList.add(
        "hidden"
    );


    sub.classList.remove(
        "hidden"
    );


    content.innerHTML =
        getSettingsContent(
            name
        );


    initializeSettingsDetail(
        name
    );


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


function closeSettingsSubPage() {

    $("#settingsSubPage")
        ?.classList.add(
            "hidden"
        );


    $("#settingsMain")
        ?.classList.remove(
            "hidden"
        );

}


/* =========================================================
   SETTINGS CONTENT
========================================================= */

function getSettingsContent(name) {

    const templates = {

        profile: `

            <span class="eyebrow">
                PROFIL
            </span>

            <h2>
                Persönliche Daten
            </h2>

            <form id="profileSettingsForm">

                <div class="input-group">

                    <label>
                        NAME
                    </label>

                    <input
                        id="profileName"
                        value="${escapeHTML(state.user.name)}"
                        required
                    >

                </div>

                <div class="input-group">

                    <label>
                        E-MAIL
                    </label>

                    <input
                        id="profileEmail"
                        type="email"
                        value="${escapeHTML(state.user.email)}"
                        required
                    >

                </div>

                <button
                    type="submit"
                    class="primary-button"
                >
                    PROFIL SPEICHERN
                </button>

                <div
                    id="profileMessage"
                    class="form-message"
                ></div>

            </form>

        `,


        notifications: `

            <span class="eyebrow">
                BENACHRICHTIGUNGEN
            </span>

            <h2>
                Mitteilungen
            </h2>

            ${settingSwitch(
                "notifications",
                "Benachrichtigungen",
                "Allgemeine Hinweise aktivieren."
            )}

            ${settingSwitch(
                "appointmentNotifications",
                "Terminerinnerungen",
                "An Termine erinnern."
            )}

            ${settingSwitch(
                "chatNotifications",
                "Chat-Benachrichtigungen",
                "Neue Familiennachrichten anzeigen."
            )}

        `,


        sound: `

            <span class="eyebrow">
                AUDIO
            </span>

            <h2>
                Töne
            </h2>

            ${settingSwitch(
                "sound",
                "Systemtöne",
                "System- und Benachrichtigungstöne aktivieren."
            )}

        `,


        voice: `

            <span class="eyebrow">
                SPRACHSTEUERUNG
            </span>

            <h2>
                Sprachsteuerung
            </h2>

            ${settingSwitch(
                "voice",
                "Sprachsteuerung",
                "Sprachbefehle aktivieren."
            )}

            <div class="info-box">

                <strong>
                    MISAIRA VOICE
                </strong>

                <p>
                    Vorbereitung für die spätere KI-Anbindung.
                </p>

            </div>

        `,


        appearance: `

            <span class="eyebrow">
                DESIGN
            </span>

            <h2>
                Darstellung
            </h2>

            ${settingSwitch(
                "glow",
                "Glow-Effekte",
                "Neon-Glow aktivieren."
            )}

            ${settingSwitch(
                "animations",
                "Animationen",
                "Animationen aktivieren."
            )}

        `,


        sync: `

            <span class="eyebrow">
                DATEN
            </span>

            <h2>
                Synchronisierung
            </h2>

            <div class="info-box">

                <strong>
                    SUPABASE
                </strong>

                <p>
                    Deine MISAIRA-Daten werden direkt
                    mit der zentralen Datenbank synchronisiert.
                </p>

            </div>

            <button
                id="syncNow"
                type="button"
                class="primary-button"
            >
                JETZT SYNCHRONISIEREN
            </button>

            <div
                id="syncMessage"
                class="form-message"
            ></div>

        `,


        security: `

            <span class="eyebrow">
                SICHERHEIT
            </span>

            <h2>
                Sicherheit
            </h2>

            ${settingSwitch(
                "security",
                "Sicherheitsmodus",
                "Zusätzliche Sicherheitsprüfungen aktivieren."
            )}

        `,


        password: `

            <span class="eyebrow">
                ACCOUNT
            </span>

            <h2>
                Passwort ändern
            </h2>

            <form id="passwordForm">

                <div class="input-group">

                    <label>
                        NEUES PASSWORT
                    </label>

                    <input
                        id="newPassword"
                        type="password"
                        minlength="8"
                        required
                    >

                </div>

                <div class="input-group">

                    <label>
                        NEUES PASSWORT BESTÄTIGEN
                    </label>

                    <input
                        id="confirmPassword"
                        type="password"
                        minlength="8"
                        required
                    >

                </div>

                <button
                    type="submit"
                    class="primary-button"
                >
                    PASSWORT ÄNDERN
                </button>

                <div
                    id="passwordMessage"
                    class="form-message"
                ></div>

            </form>

        `,


        permissions: `

            <span class="eyebrow">
                FAMILIE
            </span>

            <h2>
                Familie & Berechtigungen
            </h2>

            <div class="info-box">

                <strong>
                    DEINE FAMILIE
                </strong>

                <p>
                    ${escapeHTML(state.family.name)}
                </p>

            </div>

            <button
                type="button"
                class="primary-button"
                data-page="family"
            >
                FAMILIE VERWALTEN
            </button>

        `,


        privacy: `

            <span class="eyebrow">
                DATENSCHUTZ
            </span>

            <h2>
                Datenschutz
            </h2>

            <div class="info-box">

                <strong>
                    SUPABASE
                </strong>

                <p>
                    Deine App-Daten werden zentral in
                    Supabase gespeichert und über
                    Benutzer- und Familienrechte geschützt.
                </p>

            </div>

        `,


        language: `

            <span class="eyebrow">
                APP
            </span>

            <h2>
                Sprache
            </h2>

            <div class="input-group">

                <label>
                    APP-SPRACHE
                </label>

                <select id="languageSetting">

                    <option
                        value="de"
                        ${
                            state.settings.language === "de"
                                ? "selected"
                                : ""
                        }
                    >
                        Deutsch
                    </option>

                    <option
                        value="en"
                        ${
                            state.settings.language === "en"
                                ? "selected"
                                : ""
                        }
                    >
                        English
                    </option>

                </select>

            </div>

            <div
                id="languageMessage"
                class="form-message"
            ></div>

        `,


        help: `

            <span class="eyebrow">
                HILFE
            </span>

            <h2>
                Hilfe & FAQ
            </h2>

            <div class="info-box">

                <strong>
                    Wie erstelle ich einen Termin?
                </strong>

                <p>
                    Kalender öffnen und neuen Termin hinzufügen.
                </p>

            </div>

            <div class="info-box">

                <strong>
                    Wie funktioniert die Einkaufsliste?
                </strong>

                <p>
                    Artikel hinzufügen, abhaken oder löschen.
                </p>

            </div>

        `,


        about: `

            <span class="eyebrow">
                MISAIRA
            </span>

            <h2>
                Über MISAIRA
            </h2>

            <div class="info-box">

                <strong>
                    PRODUKT
                </strong>

                <p>
                    MISAIRA Familien Hub
                </p>

            </div>

            <div class="info-box">

                <strong>
                    VERSION
                </strong>

                <p>
                    ${MISAIRA_CONFIG.version}
                </p>

            </div>

        `,


        appInfo: `

            <span class="eyebrow">
                SYSTEM
            </span>

            <h2>
                App-Informationen
            </h2>

            <div class="info-box">

                <strong>
                    MISAIRA
                </strong>

                <p>
                    Familien Hub
                </p>

            </div>

            <div class="info-box">

                <strong>
                    VERSION
                </strong>

                <p>
                    ${MISAIRA_CONFIG.version}
                </p>

            </div>

            <div class="info-box">

                <strong>
                    DATENBANK
                </strong>

                <p>
                    Supabase
                </p>

            </div>

        `

    };


    return templates[name] ||
        templates.appInfo;

}


/* =========================================================
   SETTING SWITCH
========================================================= */

function settingSwitch(
    key,
    title,
    description
) {

    return `

        <div class="settings-switch">

            <div>

                <strong>
                    ${escapeHTML(title)}
                </strong>

                <p>
                    ${escapeHTML(description)}
                </p>

            </div>

            <label class="switch">

                <input
                    type="checkbox"
                    data-setting="${key}"
                    ${
                        state.settings[key]
                            ? "checked"
                            : ""
                    }
                >

                <span></span>

            </label>

        </div>

    `;

}


/* =========================================================
   SETTINGS EVENTS
========================================================= */

function initializeSettings() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-settings-page]"
                );


            if (!button) {

                return;

            }


            event.preventDefault();

            event.stopPropagation();


            const page =
                button.dataset
                    .settingsPage;


            if (!page) {

                return;

            }


            openSettingsSubPage(
                page
            );

        }
    );


    $("#settingsBackButton")
        ?.addEventListener(
            "click",
            event => {

                event.preventDefault();

                closeSettingsSubPage();

            }
        );

}


function initializeSettingsDetail(name) {

    $all(
        "[data-setting]"
    )
    .forEach(
        input => {

            input.addEventListener(
                "change",
                async () => {

                    const key =
                        input.dataset
                            .setting;


                    state.settings[key] =
                        input.checked;


                    if (
                        key ===
                        "sound"
                    ) {

                        state.settings.sounds =
                            input.checked;

                    }


                    if (
                        key ===
                        "sounds"
                    ) {

                        state.settings.sound =
                            input.checked;

                    }


                    await saveSettingsToSupabase();


                    applySettings();


                    showMessage(
                        "#settingsDetailContent .form-message",
                        "Einstellung gespeichert.",
                        "success"
                    );

                }
            );

        }
    );


    if (
        name ===
        "profile"
    ) {

        $("#profileSettingsForm")
            ?.addEventListener(
                "submit",
                saveProfile
            );

    }


    if (
        name ===
        "password"
    ) {

        $("#passwordForm")
            ?.addEventListener(
                "submit",
                changePassword
            );

    }


    $("#syncNow")
        ?.addEventListener(
            "click",
            async () => {

                await loadAllFamilyData();

                updateUserInterface();

                showMessage(
                    "#syncMessage",
                    "Daten wurden mit Supabase synchronisiert.",
                    "success"
                );

            }
        );


    $("#languageSetting")
        ?.addEventListener(
            "change",
            async event => {

                state.settings.language =
                    event.target.value;


                await saveSettingsToSupabase();


                showMessage(
                    "#languageMessage",
                    "Spracheinstellung gespeichert.",
                    "success"
                );

            }
        );

}


/* =========================================================
   SAVE SETTINGS
========================================================= */

async function saveSettingsToSupabase() {

    if (
        !state.user.family_id
    ) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("family_settings")
            .upsert(
                {

                    family_id:
                        state.user.family_id,

                    notifications_enabled:
                        state.settings.notifications,

                    sounds_enabled:
                        state.settings.sound,

                    voice_enabled:
                        state.settings.voice,

                    language:
                        state.settings.language,

                    theme:
                        "dark"

                },
                {
                    onConflict:
                        "family_id"
                }
            );


    if (error) {

        console.error(
            "MISAIRA Settings:",
            error
        );

    }

}


/* =========================================================
   PROFILE
========================================================= */

async function saveProfile(event) {

    event.preventDefault();


    const name =
        $("#profileName")
            ?.value
            .trim();


    const email =
        $("#profileEmail")
            ?.value
            .trim();


    if (
        !name ||
        !email
    ) {

        showMessage(
            "#profileMessage",
            "Bitte Name und E-Mail ausfüllen.",
            "error"
        );

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("profiles")
            .update({

                name,

                email

            })
            .eq(
                "id",
                state.user.id
            );


    if (error) {

        console.error(
            error
        );

        showMessage(
            "#profileMessage",
            "Profil konnte nicht gespeichert werden.",
            "error"
        );

        return;

    }


    state.user.name =
        name;


    state.user.email =
        email;


    updateUserInterface();


    showMessage(
        "#profileMessage",
        "Profil erfolgreich gespeichert.",
        "success"
    );

}


/* =========================================================
   PASSWORD
========================================================= */

async function changePassword(event) {

    event.preventDefault();


    const next =
        $("#newPassword")
            ?.value;


    const confirm =
        $("#confirmPassword")
            ?.value;


    if (
        !next ||
        next.length < 8
    ) {

        showMessage(
            "#passwordMessage",
            "Das neue Passwort muss mindestens 8 Zeichen enthalten.",
            "error"
        );

        return;

    }


    if (
        next !==
        confirm
    ) {

        showMessage(
            "#passwordMessage",
            "Die neuen Passwörter stimmen nicht überein.",
            "error"
        );

        return;

    }


    const {
        error
    } =
        await supabaseClient.auth.updateUser({

            password:
                next

        });


    if (error) {

        showMessage(
            "#passwordMessage",
            translateAuthError(
                error.message
            ),
            "error"
        );

        return;

    }


    event.target.reset();


    showMessage(
        "#passwordMessage",
        "Passwort erfolgreich geändert.",
        "success"
    );

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await supabaseClient.auth.signOut();

    } catch (error) {

        console.error(
            "MISAIRA Logout:",
            error
        );

    }


    state =
        createDefaultState();


    closeSidebar();


    $("#appScreen")
        ?.classList.add(
            "hidden"
        );


    $("#loaderScreen")
        ?.classList.add(
            "hidden"
        );


    $("#authScreen")
        ?.classList.remove(
            "hidden"
        );


    showLoginForm();


    if (
        $("#loginPassword")
    ) {

        $("#loginPassword").value =
            "";

    }

}


/* =========================================================
   HELP & FAQ
========================================================= */

const FAQ_DATA = [

    {

        q:
            "Was ist MISAIRA?",

        a:
            "MISAIRA ist euer zentraler Familien Hub für Organisation, Kommunikation und gemeinsame Familienmomente."

    },

    {

        q:
            "Wie erstelle ich einen Termin?",

        a:
            "Öffne Kalender und füge dort einen Termin hinzu."

    },

    {

        q:
            "Wie funktioniert die Einkaufsliste?",

        a:
            "Artikel hinzufügen, abhaken oder löschen."

    },

    {

        q:
            "Wo finde ich die Finanzen?",

        a:
            "Öffne in der Sidebar den Bereich Finanzen."

    },

    {

        q:
            "Wie ändere ich mein Passwort?",

        a:
            "Öffne Einstellungen und anschließend Passwort ändern."

    },

    {

        q:
            "Wie verwalte ich Familienmitglieder?",

        a:
            "Öffne Familie."

    },

    {

        q:
            "Wie funktioniert der Chat?",

        a:
            "Nachrichten werden direkt in Supabase gespeichert."

    },

    {

        q:
            "Wo werden die Daten gespeichert?",

        a:
            "Die Daten werden zentral in Supabase gespeichert."

    }

];


function renderHelp() {

    const list =
        $("#faqList");


    if (!list) {

        return;

    }


    drawFAQ("");

}


function drawFAQ(search) {

    const list =
        $("#faqList");


    if (!list) {

        return;

    }


    const query =
        String(
            search || ""
        )
        .toLowerCase()
        .trim();


    const items =
        FAQ_DATA.filter(
            item =>
                !query ||
                item.q
                    .toLowerCase()
                    .includes(query) ||
                item.a
                    .toLowerCase()
                    .includes(query)
        );


    if (!items.length) {

        list.innerHTML = `

            <div class="glass-card">
                Keine passende Frage gefunden.
            </div>

        `;

        return;

    }


    list.innerHTML =
        items
            .map(
                item => `

                    <details class="faq-item">

                        <summary>
                            ${escapeHTML(item.q)}
                        </summary>

                        <div class="faq-answer">
                            ${escapeHTML(item.a)}
                        </div>

                    </details>

                `
            )
            .join("");

}


/* =========================================================
   SUPPORT
========================================================= */

function renderSupport() {

    const form =
        $("#supportForm");


    if (!form) {

        return;

    }


    form.onsubmit =
        async event => {

            event.preventDefault();


            const subject =
                $("#supportSubject")
                    ?.value
                    .trim();


            const message =
                $("#supportMessage")
                    ?.value
                    .trim();


            if (
                !subject ||
                !message
            ) {

                showMessage(
                    "#supportFormMessage",
                    "Bitte Betreff und Nachricht ausfüllen.",
                    "error"
                );

                return;

            }


            const {
                error
            } =
                await supabaseClient
                    .from("support_requests")
                    .insert({

                        family_id:
                            state.user.family_id,

                        user_id:
                            state.user.id,

                        subject,

                        message

                    });


            if (error) {

                console.error(
                    error
                );

                showMessage(
                    "#supportFormMessage",
                    "Support-Anfrage konnte nicht gespeichert werden.",
                    "error"
                );

                return;

            }


            form.reset();


            await loadSupport();


            showMessage(
                "#supportFormMessage",
                "Support-Anfrage wurde gespeichert.",
                "success"
            );

        };

}


/* =========================================================
   ANNIVERSARY
========================================================= */

function renderAnniversary() {

    const input =
        $("#anniversaryDate");


    const form =
        $("#anniversaryForm");


    if (
        !input ||
        !form
    ) {

        return;

    }


    input.value =
        state.anniversary ||
        "";


    form.onsubmit =
        async event => {

            event.preventDefault();


            if (
                !input.value
            ) {

                return;

            }


            const existing =
                state.anniversaries[0];


            if (existing) {

                await supabaseClient
                    .from("anniversaries")
                    .update({

                        anniversary_date:
                            input.value

                    })
                    .eq(
                        "id",
                        existing.id
                    );

            } else {

                await supabaseClient
                    .from("anniversaries")
                    .insert({

                        family_id:
                            state.user.family_id,

                        title:
                            "Unser besonderer Tag",

                        anniversary_date:
                            input.value

                    });

            }


            state.anniversary =
                input.value;


            await loadAnniversaries();


            showMessage(
                "#anniversaryMessage",
                "Euer besonderer Tag wurde gespeichert.",
                "success"
            );


            updateAnniversary();

        };


    updateAnniversary();

}


function updateAnniversary() {

    const countdown =
        $("#anniversaryCountdown");


    const display =
        $("#anniversaryDateDisplay");


    if (
        !countdown ||
        !display
    ) {

        return;

    }


    if (
        !state.anniversary
    ) {

        countdown.textContent =
            "Noch kein Datum festgelegt";

        display.textContent =
            "Jetzt festlegen →";

        return;

    }


    const date =
        new Date(
            `${state.anniversary}T00:00:00`
        );


    const today =
        new Date();


    const next =
        new Date(

            today.getFullYear(),

            date.getMonth(),

            date.getDate()

        );


    if (
        next < today
    ) {

        next.setFullYear(
            today.getFullYear() + 1
        );

    }


    const diff =
        Math.ceil(
            (
                next -
                today
            ) /
            86400000
        );


    countdown.textContent =
        diff === 0
            ? "Heute ❤️"
            : `Noch ${diff} Tage ❤️`;


    display.textContent =
        date.toLocaleDateString(
            "de-DE"
        );

}


/* =========================================================
   NOTIFICATIONS
========================================================= */

function initializeNotifications() {

    const button =
        $("#notificationButton");


    const panel =
        $("#misairaNotificationPanel");


    const close =
        $("#closeNotificationPanel");


    if (
        !button ||
        !panel
    ) {

        return;

    }


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            event.stopPropagation();


            panel.classList.toggle(
                "open"
            );


            panel.setAttribute(
                "aria-hidden",
                panel.classList.contains(
                    "open"
                )
                    ? "false"
                    : "true"
            );


            renderNotifications();

        }
    );


    close?.addEventListener(
        "click",
        () => {

            panel.classList.remove(
                "open"
            );

        }
    );


    renderNotifications();

}


function renderNotifications() {

    const list =
        $("#misairaNotificationList");


    const count =
        $("#notificationCount");


    if (!list) {

        return;

    }


    const notifications =
        state.notifications ||
        [];


    if (count) {

        count.textContent =
            notifications.filter(
                item =>
                    !item.read
            ).length;

    }


    if (!notifications.length) {

        list.innerHTML = `

            <div class="misaira-notification-item">

                <strong>
                    Alles aktuell
                </strong>

                <small>
                    Aktuell liegen keine neuen
                    Benachrichtigungen vor.
                </small>

            </div>

        `;

        return;

    }


    list.innerHTML =
        notifications
            .map(
                item => `

                    <div class="misaira-notification-item">

                        <strong>
                            ${escapeHTML(item.title)}
                        </strong>

                        <small>
                            ${escapeHTML(item.text)}
                        </small>

                    </div>

                `
            )
            .join("");

}


/* =========================================================
   GLOBAL BUTTONS
========================================================= */

function initializeGlobalButtons() {

    $("#logoutButton")
        ?.addEventListener(
            "click",
            logout
        );


    $("#profileButton")
        ?.addEventListener(
            "click",
            () => {

                showPage(
                    "settings"
                );


                setTimeout(
                    () => {

                        openSettingsSubPage(
                            "profile"
                        );

                    },
                    50
                );

            }
        );

}


/* =========================================================
   SEARCH
========================================================= */

function initializeSearch() {

    document.addEventListener(
        "input",
        event => {

            if (
                event.target.id ===
                "helpSearch"
            ) {

                drawFAQ(
                    event.target.value
                );

            }

        }
    );

}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

function initializeMobileNavigation() {

    $("#mobileCore")
        ?.addEventListener(
            "click",
            () => {

                showPage(
                    "home"
                );

            }
        );

}


/* =========================================================
   SETTINGS VISUALS
========================================================= */

function applySettings() {

    if (
        state.settings.animations
    ) {

        document.body.classList.remove(
            "no-animations"
        );

    } else {

        document.body.classList.add(
            "no-animations"
        );

    }


    document.documentElement
        .style
        .setProperty(
            "--glow-enabled",
            state.settings.glow
                ? "1"
                : "0"
        );

}


/* =========================================================
   TODAY
========================================================= */

function updateToday() {

    const now =
        new Date();


    const date =
        now.toLocaleDateString(
            "de-DE",
            {

                day: "2-digit",

                month: "2-digit",

                year: "numeric"

            }
        );


    const weekday =
        now.toLocaleDateString(
            "de-DE",
            {

                weekday: "long"

            }
        );


    if (
        $("#todayDate")
    ) {

        $("#todayDate")
            .textContent =
            date;

    }


    if (
        $("#todayWeekday")
    ) {

        $("#todayWeekday")
            .textContent =
            weekday;

    }

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    selector,
    message,
    type = "info"
) {

    const element =
        typeof selector ===
        "string"
            ? $(selector)
            : selector;


    if (!element) {

        return;

    }


    element.textContent =
        message;


    element.classList.remove(
        "error",
        "success",
        "info"
    );


    element.classList.add(
        type
    );


    if (
        type ===
        "error"
    ) {

        element.style.color =
            "#ff7196";

    } else if (
        type ===
        "success"
    ) {

        element.style.color =
            "#00f5a0";

    } else {

        element.style.color =
            "#00eaff";

    }

}


/* =========================================================
   DATE
========================================================= */

function formatDateTime(value) {

    if (!value) {

        return "--";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleString(
        "de-DE",
        {

            day: "2-digit",

            month: "2-digit",

            year: "numeric",

            hour: "2-digit",

            minute: "2-digit"

        }
    );

}


function formatTime(value) {

    if (!value) {

        return "--";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "--";

    }


    return date.toLocaleTimeString(
        "de-DE",
        {

            hour: "2-digit",

            minute: "2-digit"

        }
    ) + " Uhr";

}


/* =========================================================
   MONEY
========================================================= */

function formatMoney(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "de-DE",
        {

            style: "currency",

            currency: "EUR"

        }
    );

}


/* =========================================================
   GLOBAL API
========================================================= */

window.MISAIRA5 = {

    supabase:
        supabaseClient,

    openSidebar,

    closeSidebar,

    toggleSidebar,

    showPage,

    openSettingsSubPage,

    closeSettingsSubPage,

    renderFinances,

    renderNotifications,

    updateUserInterface,

    loadAllFamilyData,

    logout

};


/* =========================================================
   LEGACY COMPATIBILITY
========================================================= */

window.clearAppData =
    async function () {

        const confirmed =
            confirm(
                "Lokale Testdaten werden nicht mehr verwendet. " +
                "Soll die aktuelle Familienansicht neu geladen werden?"
            );


        if (!confirmed) {

            return;

        }


        await loadAllFamilyData();

        updateUserInterface();

    };


/* =========================================================
   FINAL
========================================================= */

console.log(
    "MISAIRA Familien Hub 5.0.0 – SUPABASE SCRIPT GELADEN."
);

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .catch(error => {
                console.error(
                    "MISAIRA Service Worker Fehler:",
                    error
                );
            });
    });
}

/* =========================================================
   MISAIRA PUNKT 11
   ÜBER MISAIRA – TEIL 1
   STRUKTUR + STYLE
   ========================================================= */

(function () {

    "use strict";

    const STYLE_ID =
        "misaira-about-point11-style";


    function addAboutPoint11Style() {

        if (
            document.getElementById(
                STYLE_ID
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            STYLE_ID;


        style.textContent = `

/* =========================================================
   MISAIRA ÜBER-SEITE
========================================================= */

.misaira-about-point11 {

    width: 100%;
    max-width: 850px;
    margin: 0 auto;

    color: #eaf1ff;

}


.misaira-about-point11 * {

    box-sizing: border-box;

}


/* =========================================================
   HEADER
========================================================= */

.misaira-about-head {

    display: flex;
    align-items: center;

    gap: 14px;

    margin-bottom: 18px;

}


.misaira-about-info {

    width: 50px;
    height: 50px;

    flex: 0 0 50px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 15px;

    border:
        1px solid
        rgba(160,70,255,.65);

    background:
        linear-gradient(
            145deg,
            rgba(112,25,210,.30),
            rgba(0,190,255,.10)
        );

    color: #dba6ff;

    font-size: 25px;

    box-shadow:
        0 0 25px
        rgba(145,50,255,.25);

}


.misaira-about-head h2 {

    margin: 0;

    color: #f4f7ff;

    font-size: 27px;

}


.misaira-about-head p {

    margin: 5px 0 0;

    color: #9caac0;

    font-size: 11px;

    line-height: 1.5;

}


/* =========================================================
   KARTEN
========================================================= */

.misaira-about-card {

    position: relative;

    margin-top: 15px;

    padding: 16px;

    border-radius: 16px;

    border:
        1px solid
        rgba(0,190,255,.15);

    background:
        linear-gradient(
            145deg,
            rgba(5,22,45,.82),
            rgba(3,8,24,.88)
        );

    box-shadow:
        inset 0 0 30px
        rgba(0,150,255,.025);

}


/* =========================================================
   TITEL
========================================================= */

.misaira-about-title {

    display: flex;

    align-items: center;

    gap: 9px;

    margin-bottom: 11px;

    color: #55eaff;

    font-size: 14px;

}


.misaira-about-title-icon {

    font-size: 19px;

}


/* =========================================================
   APP INFORMATION
========================================================= */

.misaira-about-rows {

    overflow: hidden;

    border:
        1px solid
        rgba(100,150,230,.12);

    border-radius: 12px;

    background:
        rgba(0,0,0,.13);

}


.misaira-about-row {

    min-height: 45px;

    display: flex;

    align-items: center;

    gap: 10px;

    padding: 9px 12px;

    border-bottom:
        1px solid
        rgba(100,150,230,.08);

}


.misaira-about-row:last-child {

    border-bottom: 0;

}


.misaira-about-row-icon {

    width: 23px;

    flex: 0 0 23px;

    text-align: center;

    color: #dce6f8;

}


.misaira-about-row-name {

    flex: 1;

    color: #d8e2f4;

    font-size: 11px;

}


.misaira-about-row-value {

    max-width: 52%;

    color: #f3f6ff;

    font-size: 10px;

    text-align: right;

}


.misaira-about-online {

    color: #00f5a0;

}


/* =========================================================
   ÜBER MISAIRA HAUPTKARTE
========================================================= */

.misaira-about-main {

    position: relative;

    overflow: hidden;

    min-height: 260px;

}


.misaira-about-main::after {

    content: "";

    position: absolute;

    width: 220px;
    height: 220px;

    right: -45px;
    top: 10px;

    border-radius: 50%;

    background:
        radial-gradient(
            circle,
            rgba(184,60,255,.18),
            rgba(0,234,255,.05) 48%,
            transparent 72%
        );

    pointer-events: none;

}


.misaira-about-copy {

    position: relative;

    z-index: 2;

    max-width: 58%;

}


.misaira-about-copy h3 {

    margin: 0 0 11px;

    color: #c45cff;

    font-size: 17px;

}


.misaira-about-copy p {

    margin: 0;

    color: #d6deee;

    font-size: 11px;

    line-height: 1.7;

}


/* =========================================================
   FAMILIEN-GRAFIK
========================================================= */

.misaira-about-family-art {

    position: absolute;

    right: 20px;
    top: 20px;

    width: 230px;
    height: 175px;

    pointer-events: none;

}


.misaira-about-heart {

    position: absolute;

    top: 0;
    right: 55px;

    color: #c45cff;

    font-size: 60px;

    line-height: 1;

    text-shadow:
        0 0 15px #c45cff,
        0 0 35px
        rgba(0,234,255,.45);

}


.misaira-about-family-ground {

    position: absolute;

    right: 20px;
    bottom: 8px;

    width: 180px;
    height: 85px;

    border-radius:
        50% 50% 0 0;

    background:
        linear-gradient(
            180deg,
            rgba(115,50,255,.30),
            rgba(0,205,255,.12)
        );

    border-top:
        1px solid
        rgba(0,234,255,.5);

    box-shadow:
        0 -8px 30px
        rgba(80,80,255,.14);

}


.misaira-about-person {

    position: absolute;

    bottom: 18px;

    width: 18px;

    border-radius:
        10px 10px 4px 4px;

    background:
        linear-gradient(
            180deg,
            #8d4fff,
            #2bdcff
        );

    box-shadow:
        0 0 12px
        rgba(100,120,255,.45);

}


.misaira-about-person::before {

    content: "";

    position: absolute;

    width: 20px;
    height: 20px;

    left: -1px;
    top: -17px;

    border-radius: 50%;

    background: #9a5cff;

    box-shadow:
        0 0 12px
        rgba(0,234,255,.35);

}


.misaira-about-p1 {

    left: 25px;
    height: 66px;

}


.misaira-about-p2 {

    left: 68px;
    height: 76px;

}


.misaira-about-p3 {

    left: 111px;
    height: 59px;

}


.misaira-about-p4 {

    left: 143px;
    height: 70px;

}


/* =========================================================
   VIER KACHELN
========================================================= */

.misaira-about-values {

    position: relative;

    z-index: 3;

    display: grid;

    grid-template-columns:
        repeat(4, 1fr);

    gap: 8px;

    margin-top: 22px;

}


.misaira-about-value {

    min-height: 95px;

    display: flex;

    flex-direction: column;

    align-items: center;
    justify-content: center;

    padding: 10px 6px;

    border:
        1px solid
        rgba(0,190,255,.14);

    border-radius: 12px;

    background:
        rgba(2,13,31,.72);

    text-align: center;

}


.misaira-about-value-icon {

    margin-bottom: 7px;

    color: #18e7ff;

    font-size: 22px;

    text-shadow:
        0 0 12px
        rgba(0,234,255,.5);

}


.misaira-about-value:nth-child(2)
.misaira-about-value-icon,

.misaira-about-value:nth-child(4)
.misaira-about-value-icon {

    color: #c35cff;

}


.misaira-about-value strong {

    color: #e8efff;

    font-size: 10px;

    font-weight: 500;

}


.misaira-about-value small {

    margin-top: 3px;

    color: #7e8da7;

    font-size: 8px;

}


/* =========================================================
   WEITERE INFORMATIONEN
========================================================= */

.misaira-about-more {

    overflow: hidden;

    border:
        1px solid
        rgba(0,190,255,.12);

    border-radius: 12px;

    background:
        rgba(0,0,0,.12);

}


.misaira-about-link {

    width: 100%;

    min-height: 46px;

    display: flex;

    align-items: center;

    gap: 10px;

    padding: 8px 12px;

    border-bottom:
        1px solid
        rgba(100,150,230,.08);

    color: #d8e2f4;

    background: transparent;

    font: inherit;

    text-align: left;

}


.misaira-about-link:last-child {

    border-bottom: 0;

}


.misaira-about-link-icon {

    width: 22px;

    flex: 0 0 22px;

    text-align: center;

}


.misaira-about-link-arrow {

    margin-left: auto;

    color: #8090ab;

    font-size: 20px;

}


/* =========================================================
   HANDY / TABLET
========================================================= */

@media (max-width: 560px) {

    .misaira-about-head h2 {

        font-size: 24px;

    }


    .misaira-about-copy {

        max-width: 100%;

    }


    .misaira-about-family-art {

        position: relative;

        right: auto;
        top: auto;

        width: 100%;
        height: 145px;

        margin-top: 10px;

    }


    .misaira-about-heart {

        right:
            calc(50% - 30px);

    }


    .misaira-about-family-ground {

        right: 50%;

        transform:
            translateX(50%);

    }


    .misaira-about-values {

        grid-template-columns:
            repeat(2, 1fr);

    }


    .misaira-about-row-value {

        max-width: 45%;

    }

}

`;

        document.head.appendChild(
            style
        );

    }


    addAboutPoint11Style();

})();

/* =========================================================
   MISAIRA PUNKT 11
   ÜBER MISAIRA – TEIL 2
   ANSICHT + FUNKTION
   ========================================================= */

(function () {

    "use strict";


    function renderMisairaAbout() {

        const content =
            document.getElementById(
                "settingsDetailContent"
            );

        const main =
            document.getElementById(
                "settingsMain"
            );

        const sub =
            document.getElementById(
                "settingsSubPage"
            );


        if (
            !content ||
            !main ||
            !sub
        ) {

            console.error(
                "MISAIRA: Settings-Container nicht gefunden."
            );

            return;

        }


        /* Neue Ansicht anzeigen */

        main.classList.add(
            "hidden"
        );

        sub.classList.remove(
            "hidden"
        );


        const version =
            typeof MISAIRA_CONFIG !==
            "undefined"
                ? MISAIRA_CONFIG.version
                : "5.0.0";


        content.innerHTML = `

<div class="misaira-about-point11">


    <!-- =========================================
         HEADER
    ========================================== -->

    <div class="misaira-about-head">

        <div class="misaira-about-info">
            ⓘ
        </div>

        <div>

            <h2>
                Über MISAIRA
            </h2>

            <p>
                Hier findest du alle wichtigen Informationen
                zu MISAIRA, der App und ihrer Entwicklung.
            </p>

        </div>

    </div>


    <!-- =========================================
         APP-INFORMATIONEN
    ========================================== -->

    <section class="misaira-about-card">


        <div class="misaira-about-title">

            <span
                class="misaira-about-title-icon"
            >
                ▣
            </span>

            <span>
                App-Informationen
            </span>

        </div>


        <div class="misaira-about-rows">


            <div class="misaira-about-row">

                <span
                    class="misaira-about-row-icon"
                >
                    ⌁
                </span>

                <span
                    class="misaira-about-row-name"
                >
                    App-Version
                </span>

                <span
                    class="misaira-about-row-value"
                >
                    ${version}
                </span>

                <span>
                    ›
                </span>

            </div>


            <div class="misaira-about-row">

                <span
                    class="misaira-about-row-icon"
                >
                    ▤
                </span>

                <span
                    class="misaira-about-row-name"
                >
                    Build-Nummer
                </span>

                <span
                    class="misaira-about-row-value"
                >
                    5000
                </span>

                <span>
                    ›
                </span>

            </div>


            <div class="misaira-about-row">

                <span
                    class="misaira-about-row-icon"
                >
                    ◎
                </span>

                <span
                    class="misaira-about-row-name"
                >
                    System
                </span>

                <span
                    class="misaira-about-row-value"
                >
                    Web App / PWA
                </span>

                <span>
                    ›
                </span>

            </div>


            <div class="misaira-about-row">

                <span
                    class="misaira-about-row-icon"
                >
                    ◇
                </span>

                <span
                    class="misaira-about-row-name"
                >
                    Entwickelt mit
                </span>

                <span
                    class="misaira-about-row-value"
                >
                    HTML, CSS, JS
                </span>

                <span>
                    ›
                </span>

            </div>


            <div class="misaira-about-row">

                <span
                    class="misaira-about-row-icon"
                >
                    ♧
                </span>

                <span
                    class="misaira-about-row-name"
                >
                    Server-Status
                </span>

                <span
                    class="
                        misaira-about-row-value
                        misaira-about-online
                    "
                >
                    Online
                </span>

                <span>
                    ›
                </span>

            </div>


            <div class="misaira-about-row">

                <span
                    class="misaira-about-row-icon"
                >
                    ♙
                </span>

                <span
                    class="misaira-about-row-name"
                >
                    Datenschutz
                </span>

                <span
                    class="misaira-about-row-value
                    "
                >
                    Supabase / Familienzugriff
                </span>

                <span>
                    ›
                </span>

            </div>


        </div>

    </section>


    <!-- =========================================
         ÜBER MISAIRA
    ========================================== -->

    <section
        class="
            misaira-about-card
            misaira-about-main
        "
    >


        <div class="misaira-about-copy">

            <h3>
                ♡ Über MISAIRA
            </h3>

            <p>
                MISAIRA ist dein zentraler Familien-Hub.<br>
                Alle wichtigen Tools für deine Familie –<br>
                an einem Ort. Sicher, privat und<br>
                mit Liebe entwickelt.
            </p>

        </div>


        <!-- Familien-Grafik -->

        <div
            class="misaira-about-family-art"
            aria-hidden="true"
        >

            <div
                class="misaira-about-heart"
            >
                ♡
            </div>


            <div
                class="misaira-about-family-ground"
            >

                <div
                    class="
                        misaira-about-person
                        misaira-about-p1
                    "
                ></div>


                <div
                    class="
                        misaira-about-person
                        misaira-about-p2
                    "
                ></div>


                <div
                    class="
                        misaira-about-person
                        misaira-about-p3
                    "
                ></div>


                <div
                    class="
                        misaira-about-person
                        misaira-about-p4
                    "
                ></div>

            </div>

        </div>


        <!-- =====================================
             VIER WERTE
        ====================================== -->

        <div
            class="misaira-about-values"
        >


            <div
                class="misaira-about-value"
            >

                <div
                    class="
                        misaira-about-value-icon
                    "
                >
                    ♧
                </div>

                <strong>
                    Familie
                </strong>

                <small>
                    im Mittelpunkt
                </small>

            </div>


            <div
                class="misaira-about-value"
            >

                <div
                    class="
                        misaira-about-value-icon
                    "
                >
                    ♢
                </div>

                <strong>
                    Sicherheit
                </strong>

                <small>
                    an erster Stelle
                </small>

            </div>


            <div
                class="misaira-about-value"
            >

                <div
                    class="
                        misaira-about-value-icon
                    "
                >
                    🚀
                </div>

                <strong>
                    Entwicklung
                </strong>

                <small>
                    mit Leidenschaft
                </small>

            </div>


            <div
                class="misaira-about-value"
            >

                <div
                    class="
                        misaira-about-value-icon
                    "
                >
                    ♙
                </div>

                <strong>
                    Privatsphäre
                </strong>

                <small>
                    geschützt
                </small>

            </div>


        </div>

    </section>


    <!-- =========================================
         WEITERE INFORMATIONEN
    ========================================== -->

    <section
        class="misaira-about-card"
    >


        <div
            class="misaira-about-title"
        >

            <span
                class="
                    misaira-about-title-icon
                "
            >
                ⌘
            </span>

            <span>
                Weitere Informationen
            </span>

        </div>


        <div
            class="misaira-about-more"
        >


            <div
                class="misaira-about-link"
            >

                <span
                    class="
                        misaira-about-link-icon
                    "
                >
                    ▤
                </span>

                <span>
                    Nutzungsbedingungen
                </span>

                <span
                    class="
                        misaira-about-link-arrow
                    "
                >
                    ›
                </span>

            </div>


            <div
                class="misaira-about-link"
            >

                <span
                    class="
                        misaira-about-link-icon
                    "
                >
                    ♢
                </span>

                <span>
                    Datenschutzerklärung
                </span>

                <span
                    class="
                        misaira-about-link-arrow
                    "
                >
                    ›
                </span>

            </div>


            <div
                class="misaira-about-link"
            >

                <span
                    class="
                        misaira-about-link-icon
                    "
                >
                    &lt;/&gt;
                </span>

                <span>
                    Open Source Lizenzen
                </span>

                <span
                    class="
                        misaira-about-link-arrow
                    "
                >
                    ›
                </span>

            </div>


            <div
                class="misaira-about-link"
            >

                <span
                    class="
                        misaira-about-link-icon
                    "
                >
                    ♧
                </span>

                <span>
                    Mitwirkende
                </span>

                <span
                    class="
                        misaira-about-link-arrow
                    "
                >
                    ›
                </span>

            </div>


            <div
                class="misaira-about-link"
            >

                <span
                    class="
                        misaira-about-link-icon
                    "
                >
                    ✉
                </span>

                <span>
                    Kontakt / Support
                </span>

                <span
                    class="
                        misaira-about-link-arrow
                    "
                >
                    ›
                </span>

            </div>


        </div>

    </section>


</div>

`;


        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }


    /* =====================================================
       KLICK AUF „ÜBER MISAIRA“ ABFANGEN
    ===================================================== */

    document.addEventListener(

        "click",

        function (event) {


            const button =
                event.target.closest(
                    "[data-settings-page]"
                );


            if (!button) {

                return;

            }


            if (
                button.dataset.settingsPage !==
                "about"
            ) {

                return;

            }


            event.preventDefault();

            event.stopImmediatePropagation();


            renderMisairaAbout();

        },

        true

    );


})();

/* =========================================================
   MISAIRA PUNKT 14
   FAMILIENPROFILE – TEIL 1
   EIGENER STYLE
========================================================= */

(function () {

    "use strict";

    const STYLE_ID =
        "misaira-familyprofiles-point14-style";


    if (
        document.getElementById(
            STYLE_ID
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        STYLE_ID;


    style.textContent = `

/* =========================================================
   FAMILIENPROFILE
========================================================= */

.misaira-familyprofiles {

    width: 100%;
    max-width: 900px;
    margin: 0 auto;

    color: #edf3ff;

}


/* HEADER */

.misaira-familyprofiles-header {

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 15px;

    margin-bottom: 12px;

}


.misaira-familyprofiles-title {

    display: flex;

    align-items: center;

    gap: 12px;

}


.misaira-familyprofiles-icon {

    width: 48px;
    height: 48px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 14px;

    color: #d59cff;

    background:
        linear-gradient(
            145deg,
            rgba(125,35,220,.35),
            rgba(0,190,255,.12)
        );

    border:
        1px solid
        rgba(170,70,255,.65);

    box-shadow:
        0 0 25px
        rgba(150,50,255,.25);

    font-size: 23px;

}


.misaira-familyprofiles-title h2 {

    margin: 0;

    color: #f4f7ff;

    font-size: 24px;

}


.misaira-familyprofiles-subtitle {

    margin-top: 3px;

    color: #9ba8bd;

    font-size: 10px;

}


/* ADD BUTTON */

.misaira-familyprofiles-add {

    min-height: 40px;

    padding:
        0 16px;

    border:
        1px solid
        rgba(165,65,255,.65);

    border-radius: 9px;

    color: white;

    background:
        linear-gradient(
            90deg,
            rgba(90,25,180,.65),
            rgba(165,35,235,.70)
        );

    box-shadow:
        0 0 20px
        rgba(150,40,255,.18);

    font-size: 10px;

    cursor: pointer;

}


/* DESCRIPTION */

.misaira-familyprofiles-description {

    margin:
        0 0 18px;

    color: #d3dced;

    font-size: 11px;

    line-height: 1.65;

}


/* PROFILE LIST */

.misaira-familyprofiles-list {

    display: flex;

    flex-direction: column;

    gap: 7px;

}


/* PROFILE CARD */

.misaira-familyprofile-card {

    position: relative;

    display: flex;

    align-items: center;

    gap: 15px;

    min-height: 126px;

    padding:
        12px 14px 12px 18px;

    overflow: hidden;

    border:
        1px solid
        rgba(80,145,205,.15);

    border-radius: 13px;

    background:
        linear-gradient(
            145deg,
            rgba(5,22,43,.88),
            rgba(2,10,27,.94)
        );

    box-shadow:
        inset 0 0 25px
        rgba(0,150,255,.025);

}


.misaira-familyprofile-card::before {

    content: "";

    position: absolute;

    left: 0;
    top: 8px;
    bottom: 8px;

    width: 4px;

    border-radius:
        0 5px 5px 0;

    background:
        var(--profile-accent);

    box-shadow:
        0 0 15px
        var(--profile-accent);

}


/* AVATAR */

.misaira-familyprofile-avatar {

    position: relative;

    width: 88px;
    height: 88px;

    flex: 0 0 88px;

    display: flex;

    align-items: center;
    justify-content: center;

    border:
        3px solid
        var(--profile-accent);

    border-radius: 50%;

    background:
        radial-gradient(
            circle,
            rgba(25,50,85,.9),
            rgba(3,10,26,.98)
        );

    box-shadow:
        0 0 18px
        color-mix(
            in srgb,
            var(--profile-accent) 65%,
            transparent
        );

    overflow: visible;

}


.misaira-familyprofile-avatar img {

    width: 100%;
    height: 100%;

    object-fit: cover;

    border-radius: 50%;

}


.misaira-familyprofile-initial {

    color: white;

    font-size: 32px;

    text-shadow:
        0 0 15px
        var(--profile-accent);

}


/* CAMERA */

.misaira-familyprofile-camera {

    position: absolute;

    right: -7px;
    bottom: -3px;

    width: 32px;
    height: 32px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 50%;

    background:
        rgba(20,31,53,.96);

    border:
        1px solid
        rgba(150,170,210,.3);

    box-shadow:
        0 0 12px
        rgba(0,0,0,.4);

    font-size: 15px;

}


/* INFORMATION */

.misaira-familyprofile-info {

    flex: 1;

    min-width: 0;

}


.misaira-familyprofile-name {

    margin-bottom: 5px;

    color: #f3f6ff;

    font-size: 20px;

    font-weight: 600;

}


.misaira-familyprofile-role {

    display: inline-block;

    margin-bottom: 7px;

    padding:
        3px 8px;

    border-radius: 5px;

    color: var(--profile-accent);

    background:
        color-mix(
            in srgb,
            var(--profile-accent) 18%,
            transparent
        );

    font-size: 9px;

}


.misaira-familyprofile-detail {

    display: flex;

    align-items: center;

    gap: 7px;

    margin-top: 5px;

    color: #d0d9e8;

    font-size: 9px;

}


.misaira-familyprofile-detail-icon {

    width: 15px;

    color: #aab8cd;

    text-align: center;

}


/* ACTIONS */

.misaira-familyprofile-actions {

    display: flex;

    align-items: center;

    gap: 9px;

}


.misaira-familyprofile-edit {

    width: 50px;
    height: 50px;

    display: flex;

    align-items: center;
    justify-content: center;

    border:
        1px solid
        color-mix(
            in srgb,
            var(--profile-accent) 45%,
            transparent
        );

    border-radius: 50%;

    color: var(--profile-accent);

    background:
        rgba(2,13,30,.55);

    font-size: 20px;

    cursor: pointer;

}


.misaira-familyprofile-arrow {

    color: #e2e8f5;

    font-size: 28px;

}


/* BOTTOM INFO */

.misaira-familyprofiles-info {

    display: flex;

    align-items: center;

    gap: 14px;

    margin-top: 9px;

    padding:
        12px 15px;

    border:
        1px solid
        rgba(120,70,220,.25);

    border-radius: 12px;

    background:
        linear-gradient(
            90deg,
            rgba(70,25,150,.22),
            rgba(0,120,190,.08)
        );

}


.misaira-familyprofiles-info-icon {

    color: #d85cff;

    font-size: 29px;

    text-shadow:
        0 0 15px
        #d85cff;

}


.misaira-familyprofiles-info-text {

    flex: 1;

    color: #e4eaf7;

    font-size: 10px;

    line-height: 1.5;

}


.misaira-familyprofiles-info-arrow {

    color: #28dfff;

    font-size: 28px;

}


/* MOBILE */

@media (max-width: 600px) {

    .misaira-familyprofiles-header {

        align-items:
            flex-start;

    }


    .misaira-familyprofiles-add {

        padding:
            0 11px;

        font-size: 9px;

    }


    .misaira-familyprofile-card {

        min-height: 112px;

        gap: 11px;

        padding:
            10px 10px 10px 14px;

    }


    .misaira-familyprofile-avatar {

        width: 72px;
        height: 72px;

        flex-basis: 72px;

    }


    .misaira-familyprofile-name {

        font-size: 17px;

    }


    .misaira-familyprofile-detail {

        font-size: 8px;

    }


    .misaira-familyprofile-edit {

        width: 40px;
        height: 40px;

        font-size: 17px;

    }


    .misaira-familyprofile-arrow {

        font-size: 23px;

    }

}

`;

    document.head.appendChild(
        style
    );

})();

/* =========================================================
   MISAIRA PUNKT 14
   FAMILIENPROFILE – TEIL 2
   STRUKTUR + ANZEIGE
========================================================= */

(function () {

    "use strict";


    function renderMisairaFamilyProfiles() {

        const content =
            document.getElementById(
                "settingsDetailContent"
            );

        const main =
            document.getElementById(
                "settingsMain"
            );

        const sub =
            document.getElementById(
                "settingsSubPage"
            );


        if (
            !content ||
            !main ||
            !sub
        ) {

            console.error(
                "MISAIRA: Familienprofil-Container nicht gefunden."
            );

            return;

        }


        main.classList.add(
            "hidden"
        );

        sub.classList.remove(
            "hidden"
        );


        /*
         * Vorhandene Familienmitglieder verwenden.
         * Falls noch keine Daten geladen wurden,
         * werden die bereits bekannten Beispielprofile
         * als visuelle Vorlage angezeigt.
         */

        const members =
            Array.isArray(
                window.familyMembers
            )
                ? window.familyMembers
                : [];


        const demoProfiles = [

            {
                name: "Mailo",
                role: "Ich",
                color: "#00eaff",
                birthday: "23.03.2015",
                age: "9 Jahre",
                hobbies:
                    "Fußball, Gaming, Lesen",
                avatar: ""
            },

            {
                name: "Saphira",
                role: "Meine Schwester",
                color: "#b65cff",
                birthday: "12.07.2012",
                age: "11 Jahre",
                hobbies:
                    "Reiten, Malen, Musik",
                avatar: ""
            },

            {
                name: "Michelle",
                role: "Meine Schwester",
                color: "#ff4fc8",
                birthday: "27.01.1996",
                age: "28 Jahre",
                hobbies:
                    "Fitness, Kochen, Reisen",
                avatar: ""
            },

            {
                name: "Michel",
                role: "Mein Bruder",
                color: "#587dff",
                birthday: "15.09.1993",
                age: "30 Jahre",
                hobbies:
                    "Technik, Autos, Wandern",
                avatar: ""
            },

            {
                name: "Mama",
                role: "Unsere Mama",
                color: "#e74fc3",
                birthday: "04.04.1978",
                age: "46 Jahre",
                hobbies:
                    "Garten, Backen, Familie",
                avatar: ""
            },

            {
                name: "Papa",
                role: "Unser Papa",
                color: "#16d9d9",
                birthday: "10.11.1976",
                age: "47 Jahre",
                hobbies:
                    "Sport, Grillen, Heimwerken",
                avatar: ""
            }

        ];


        /*
         * Wenn echte Mitglieder vorhanden sind,
         * diese zuerst verwenden.
         */

        const profiles =
            members.length
                ? members.map(
                    function (member, index) {

                        return {

                            name:
                                member.name ||
                                "Familienmitglied",

                            role:
                                member.role ||
                                "Familienmitglied",

                            color:
                                member.color ||
                                demoProfiles[
                                    index %
                                    demoProfiles.length
                                ].color,

                            birthday:
                                member.birthday ||
                                "",

                            age:
                                member.age ||
                                "",

                            hobbies:
                                member.hobbies ||
                                "",

                            avatar:
                                member.avatar_url ||
                                ""

                        };

                    }
                )
                : demoProfiles;


        const version =
            typeof MISAIRA_CONFIG !==
            "undefined"
                ? MISAIRA_CONFIG.version
                : "5.0.0";


        content.innerHTML = `

<div class="misaira-familyprofiles">


    <!-- =========================================
         KOPF
    ========================================== -->

    <div
        class="
            misaira-familyprofiles-header
        "
    >

        <div
            class="
                misaira-familyprofiles-title
            "
        >

            <div
                class="
                    misaira-familyprofiles-icon
                "
            >
                👨‍👩‍👧‍👦
            </div>

            <div>

                <h2>
                    Familienprofile
                </h2>

                <div
                    class="
                        misaira-familyprofiles-subtitle
                    "
                >
                    14. Familienprofile integrieren
                </div>

            </div>

        </div>


        <button
            type="button"
            class="
                misaira-familyprofiles-add
            "
            data-familyprofile-add
        >
            ＋ Profil hinzufügen
        </button>

    </div>


    <!-- =========================================
         BESCHREIBUNG
    ========================================== -->

    <p
        class="
            misaira-familyprofiles-description
        "
    >
        Verwalte die Profile deiner Familienmitglieder.<br>
        Jedes Profil hat eigene Informationen, Farben
        und Einstellungen.
    </p>


    <!-- =========================================
         PROFILE
    ========================================== -->

    <div
        class="
            misaira-familyprofiles-list
        "
    >

        ${profiles.map(
            function (profile, index) {

                const safeName =
                    String(
                        profile.name ||
                        "Familienmitglied"
                    )
                    .replace(
                        /"/g,
                        "&quot;"
                    );


                const initial =
                    safeName
                        .charAt(0)
                        .toUpperCase();


                return `

                <article
                    class="
                        misaira-familyprofile-card
                    "
                    style="
                        --profile-accent:
                        ${profile.color};
                    "
                    data-family-profile-index="${index}"
                >


                    <!-- PROFILBILD -->

                    <div
                        class="
                            misaira-familyprofile-avatar
                        "
                    >

                        ${
                            profile.avatar
                                ? `
                                <img
                                    src="${profile.avatar}"
                                    alt="${safeName}"
                                >
                                `
                                : `
                                <span
                                    class="
                                        misaira-familyprofile-initial
                                    "
                                >
                                    ${initial}
                                </span>
                                `
                        }


                        <button
                            type="button"
                            class="
                                misaira-familyprofile-camera
                            "
                            title="Profilbild ändern"
                            data-profile-camera="${index}"
                        >
                            📷
                        </button>

                    </div>


                    <!-- INFORMATIONEN -->

                    <div
                        class="
                            misaira-familyprofile-info
                        "
                    >

                        <div
                            class="
                                misaira-familyprofile-name
                            "
                        >
                            ${safeName}
                        </div>


                        <div
                            class="
                                misaira-familyprofile-role
                            "
                        >
                            ${profile.role}
                        </div>


                        ${
                            profile.birthday
                                ? `
                                <div
                                    class="
                                        misaira-familyprofile-detail
                                    "
                                >

                                    <span
                                        class="
                                            misaira-familyprofile-detail-icon
                                        "
                                    >
                                        ▣
                                    </span>

                                    <span>
                                        ${profile.birthday}
                                        ${
                                            profile.age
                                                ? ` (${profile.age})`
                                                : ""
                                        }
                                    </span>

                                </div>
                                `
                                : ""
                        }


                        ${
                            profile.color
                                ? `
                                <div
                                    class="
                                        misaira-familyprofile-detail
                                    "
                                >

                                    <span
                                        class="
                                            misaira-familyprofile-detail-icon
                                        "
                                    >
                                        ◉
                                    </span>

                                    <span>
                                        Farbe:
                                        ${profile.color}
                                    </span>

                                </div>
                                `
                                : ""
                        }


                        ${
                            profile.hobbies
                                ? `
                                <div
                                    class="
                                        misaira-familyprofile-detail
                                    "
                                >

                                    <span
                                        class="
                                            misaira-familyprofile-detail-icon
                                        "
                                    >
                                        ☆
                                    </span>

                                    <span>
                                        Hobbys:
                                        ${profile.hobbies}
                                    </span>

                                </div>
                                `
                                : ""
                        }

                    </div>


                    <!-- AKTIONEN -->

                    <div
                        class="
                            misaira-familyprofile-actions
                        "
                    >

                        <button
                            type="button"
                            class="
                                misaira-familyprofile-edit
                            "
                            title="Profil bearbeiten"
                            data-profile-edit="${index}"
                        >
                            ✎
                        </button>

                        <span
                            class="
                                misaira-familyprofile-arrow
                            "
                        >
                            ›
                        </span>

                    </div>

                </article>

                `;

            }
        ).join("")}

    </div>


    <!-- =========================================
         HINWEIS
    ========================================== -->

    <div
        class="
            misaira-familyprofiles-info
        "
    >

        <div
            class="
                misaira-familyprofiles-info-icon
            "
        >
            ♡
        </div>

        <div
            class="
                misaira-familyprofiles-info-text
            "
        >

            <strong>
                Jedes Familienprofil kann individuell
                angepasst werden.
            </strong>

            <br>

            Profilbild, Farbe, Geburtstag,
            Hobbys und mehr.

        </div>

        <div
            class="
                misaira-familyprofiles-info-arrow
            "
        >
            ›
        </div>

    </div>

</div>

`;


        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });


        /*
         * Profil hinzufügen
         */

        const addButton =
            content.querySelector(
                "[data-familyprofile-add]"
            );


        if (addButton) {

            addButton.addEventListener(
                "click",
                function () {

                    alert(
                        "Profil hinzufügen wird als nächster Schritt mit der Familien-Datenbank verbunden."
                    );

                }
            );

        }


        /*
         * Bearbeiten
         */

        content
            .querySelectorAll(
                "[data-profile-edit]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const index =
                                Number(
                                    button.dataset
                                        .profileEdit
                                );


                            const profile =
                                profiles[index];


                            alert(
                                "Profil bearbeiten: " +
                                profile.name
                            );

                        }
                    );

                }
            );


        /*
         * Profilbild
         */

        content
            .querySelectorAll(
                "[data-profile-camera]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const index =
                                Number(
                                    button.dataset
                                        .profileCamera
                                );


                            const profile =
                                profiles[index];


                            alert(
                                "Profilbild für " +
                                profile.name +
                                " ändern."
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       FAMILIENPROFILE ÖFFNEN
    ===================================================== */

    document.addEventListener(

        "click",

        function (event) {

            const button =
                event.target.closest(
                    "[data-settings-page]"
                );


            if (!button) {

                return;

            }


            if (
                button.dataset.settingsPage !==
                "family"
            ) {

                return;

            }


            event.preventDefault();

            event.stopImmediatePropagation();


            renderMisairaFamilyProfiles();

        },

        true

    );


})();

/* =========================================================
   MISAIRA PUNKT 14
   FAMILIENPROFILE – TEIL 2
========================================================= */

(function () {

    "use strict";

    function renderMisairaFamilyProfiles() {

        const content = document.getElementById(
            "settingsDetailContent"
        );

        const main = document.getElementById(
            "settingsMain"
        );

        const sub = document.getElementById(
            "settingsSubPage"
        );

        if (!content || !main || !sub) {
            console.error(
                "MISAIRA: Familienprofil-Container nicht gefunden."
            );
            return;
        }

        main.classList.add("hidden");
        sub.classList.remove("hidden");

        const profiles = [
            {
                name: "Mailo",
                role: "Ich",
                birthday: "23.03.2015",
                age: "9 Jahre",
                color: "Cyan",
                hobbies: "Fußball, Gaming, Lesen",
                accent: "#00eaff"
            },
            {
                name: "Saphira",
                role: "Meine Schwester",
                birthday: "12.07.2012",
                age: "11 Jahre",
                color: "Lila",
                hobbies: "Reiten, Malen, Musik",
                accent: "#b65cff"
            },
            {
                name: "Michelle",
                role: "Meine Schwester",
                birthday: "27.01.1996",
                age: "28 Jahre",
                color: "Pink",
                hobbies: "Fitness, Kochen, Reisen",
                accent: "#ff4fc8"
            },
            {
                name: "Michel",
                role: "Mein Bruder",
                birthday: "15.09.1993",
                age: "30 Jahre",
                color: "Blau",
                hobbies: "Technik, Autos, Wandern",
                accent: "#587dff"
            },
            {
                name: "Mama",
                role: "Unsere Mama",
                birthday: "04.04.1978",
                age: "46 Jahre",
                color: "Magenta",
                hobbies: "Garten, Backen, Familie",
                accent: "#e74fc3"
            },
            {
                name: "Papa",
                role: "Unser Papa",
                birthday: "10.11.1976",
                age: "47 Jahre",
                color: "Türkis",
                hobbies: "Sport, Grillen, Heimwerken",
                accent: "#16d9d9"
            }
        ];

        let cards = "";

        profiles.forEach(function (profile, index) {

            cards +=
                '<article class="misaira-familyprofile-card" ' +
                'style="--profile-accent:' +
                profile.accent +
                ';">' +

                    '<div class="misaira-familyprofile-avatar">' +

                        '<span class="misaira-familyprofile-initial">' +
                            profile.name.charAt(0) +
                        '</span>' +

                        '<button type="button" ' +
                            'class="misaira-familyprofile-camera" ' +
                            'data-profile-camera="' +
                            index +
                            '">' +
                            '📷' +
                        '</button>' +

                    '</div>' +

                    '<div class="misaira-familyprofile-info">' +

                        '<div class="misaira-familyprofile-name">' +
                            profile.name +
                        '</div>' +

                        '<div class="misaira-familyprofile-role">' +
                            profile.role +
                        '</div>' +

                        '<div class="misaira-familyprofile-detail">' +
                            '<span class="misaira-familyprofile-detail-icon">▣</span>' +
                            '<span>' +
                                profile.birthday +
                                " (" +
                                profile.age +
                                ")" +
                            '</span>' +
                        '</div>' +

                        '<div class="misaira-familyprofile-detail">' +
                            '<span class="misaira-familyprofile-detail-icon">◉</span>' +
                            '<span>Farbe: ' +
                                profile.color +
                            '</span>' +
                        '</div>' +

                        '<div class="misaira-familyprofile-detail">' +
                            '<span class="misaira-familyprofile-detail-icon">☆</span>' +
                            '<span>Hobbys: ' +
                                profile.hobbies +
                            '</span>' +
                        '</div>' +

                    '</div>' +

                    '<div class="misaira-familyprofile-actions">' +

                        '<button type="button" ' +
                            'class="misaira-familyprofile-edit" ' +
                            'data-profile-edit="' +
                            index +
                            '">' +
                            '✎' +
                        '</button>' +

                        '<span class="misaira-familyprofile-arrow">›</span>' +

                    '</div>' +

                '</article>';

        });


        content.innerHTML =
            '<div class="misaira-familyprofiles">' +

                '<div class="misaira-familyprofiles-header">' +

                    '<div class="misaira-familyprofiles-title">' +

                        '<div class="misaira-familyprofiles-icon">' +
                            '👨‍👩‍👧‍👦' +
                        '</div>' +

                        '<div>' +

                            '<h2>Familienprofile</h2>' +

                            '<div class="misaira-familyprofiles-subtitle">' +
    '' +
'</div>' +

                        '</div>' +

                    '</div>' +

                    '<button type="button" ' +
                        'class="misaira-familyprofiles-add" ' +
                        'data-familyprofile-add>' +
                        '＋ Profil hinzufügen' +
                    '</button>' +

                '</div>' +

                '<p class="misaira-familyprofiles-description">' +
                    'Verwalte die Profile deiner Familienmitglieder.<br>' +
                    'Jedes Profil hat eigene Informationen, Farben und Einstellungen.' +
                '</p>' +

                '<div class="misaira-familyprofiles-list">' +
                    cards +
                '</div>' +

                '<div class="misaira-familyprofiles-info">' +

                    '<div class="misaira-familyprofiles-info-icon">' +
                        '♡' +
                    '</div>' +

                    '<div class="misaira-familyprofiles-info-text">' +
                        '<strong>' +
                            'Jedes Familienprofil kann individuell angepasst werden.' +
                        '</strong>' +
                        '<br>' +
                        'Profilbild, Farbe, Geburtstag, Hobbys und mehr.' +
                    '</div>' +

                    '<div class="misaira-familyprofiles-info-arrow">' +
                        '›' +
                    '</div>' +

                '</div>' +

            '</div>';


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


        content
            .querySelectorAll("[data-profile-edit]")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const index =
                            Number(
                                button.dataset.profileEdit
                            );

                        alert(
                            "Profil bearbeiten: " +
                            profiles[index].name
                        );

                    }
                );

            });


        content
            .querySelectorAll("[data-profile-camera]")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const index =
                            Number(
                                button.dataset.profileCamera
                            );

                        alert(
                            "Profilbild für " +
                            profiles[index].name +
                            " ändern."
                        );

                    }
                );

            });


        const addButton =
            content.querySelector(
                "[data-familyprofile-add]"
            );

        if (addButton) {

            addButton.addEventListener(
                "click",
                function () {

                    alert(
                        "Profil hinzufügen"
                    );

                }
            );

        }

    }


    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    "[data-settings-page]"
                );

            if (!button) {
                return;
            }

            if (
                button.dataset.settingsPage !==
                "family"
            ) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            renderMisairaFamilyProfiles();

        },
        true
    );

})();

/* =========================================================
   MISAIRA PUNKT 14
   FAMILIENPROFILE – TEIL 3
   BEARBEITEN + HINZUFÜGEN + DAUERHAFT SPEICHERN
========================================================= */

(function () {

    "use strict";


    const BUCKET =
        "family-profile-images";


    let observerBusy = false;


    /* =====================================================
       HILFSFUNKTIONEN
    ===================================================== */

    function familyId() {

        return (
            state &&
            state.user &&
            state.user.family_id
        ) || "";

    }


    function escape(value) {

        if (
            typeof escapeHTML ===
            "function"
        ) {

            return escapeHTML(
                value || ""
            );

        }

        return String(
            value || ""
        )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    }


    function calculateAge(
        date
    ) {

        if (!date) {

            return "";

        }

        const birth =
            new Date(
                date +
                "T00:00:00"
            );

        if (
            Number.isNaN(
                birth.getTime()
            )
        ) {

            return "";

        }

        const now =
            new Date();

        let age =
            now.getFullYear() -
            birth.getFullYear();

        const month =
            now.getMonth() -
            birth.getMonth();

        if (
            month < 0 ||
            (
                month === 0 &&
                now.getDate() <
                birth.getDate()
            )
        ) {

            age--;

        }

        return age >= 0
            ? age + " Jahre"
            : "";

    }


    function formatBirthday(
        date
    ) {

        if (!date) {

            return "";

        }

        const parts =
            date.split("-");

        if (
            parts.length !== 3
        ) {

            return date;

        }

        return (
            parts[2] +
            "." +
            parts[1] +
            "." +
            parts[0]
        );

    }


    /* =====================================================
       DEMO-PROFILE EINMALIG ANLEGEN
       Damit die sechs Profile aus unserer Vorlage
       dauerhaft in Supabase vorhanden sind.
    ===================================================== */

    async function ensureFamilyProfiles() {

        const id =
            familyId();

        if (!id) {

            return [];

        }


        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "family_profiles"
                )
                .select("*")
                .eq(
                    "family_id",
                    id
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (error) {

            console.error(
                "MISAIRA Familienprofile laden:",
                error
            );

            return [];

        }


        if (
            data &&
            data.length
        ) {

            return data;

        }


        const defaults = [

            {
                family_id: id,
                display_name: "Mailo",
                family_role: "Ich",
                birth_date: "2015-03-23",
                favorite_color: "Cyan",
                hobbies:
                    "Fußball, Gaming, Lesen"
            },

            {
                family_id: id,
                display_name: "Saphira",
                family_role: "Meine Schwester",
                birth_date: "2012-07-12",
                favorite_color: "Lila",
                hobbies:
                    "Reiten, Malen, Musik"
            },

            {
                family_id: id,
                display_name: "Michelle",
                family_role: "Meine Schwester",
                birth_date: "1996-01-27",
                favorite_color: "Pink",
                hobbies:
                    "Fitness, Kochen, Reisen"
            },

            {
                family_id: id,
                display_name: "Michel",
                family_role: "Mein Bruder",
                birth_date: "1993-09-15",
                favorite_color: "Blau",
                hobbies:
                    "Technik, Autos, Wandern"
            },

            {
                family_id: id,
                display_name: "Mama",
                family_role: "Unsere Mama",
                birth_date: "1978-04-04",
                favorite_color: "Magenta",
                hobbies:
                    "Garten, Backen, Familie"
            },

            {
                family_id: id,
                display_name: "Papa",
                family_role: "Unser Papa",
                birth_date: "1976-11-10",
                favorite_color: "Türkis",
                hobbies:
                    "Sport, Grillen, Heimwerken"
            }

        ];


        const {
            data: created,
            error: createError
        } =
            await supabaseClient
                .from(
                    "family_profiles"
                )
                .insert(
                    defaults
                )
                .select();


        if (createError) {

            console.error(
                "MISAIRA Familienprofile erstellen:",
                createError
            );

            return [];

        }


        return created || [];

    }


    /* =====================================================
       PROFILBILD URL
    ===================================================== */

    async function getAvatarUrl(
        path
    ) {

        if (!path) {

            return "";

        }


        const {
            data,
            error
        } =
            await supabaseClient
                .storage
                .from(
                    BUCKET
                )
                .createSignedUrl(
                    path,
                    86400
                );


        if (error) {

            console.error(
                "MISAIRA Profilbild URL:",
                error
            );

            return "";

        }


        return (
            data &&
            data.signedUrl
        ) || "";

    }


    /* =====================================================
       AKZENTFARBE
    ===================================================== */

    function getAccent(
        color
    ) {

        const colors = {

            Cyan:
                "#00eaff",

            Lila:
                "#b65cff",

            Pink:
                "#ff4fc8",

            Blau:
                "#587dff",

            Magenta:
                "#e74fc3",

            Türkis:
                "#16d9d9"

        };


        return (
            colors[color] ||
            "#00eaff"
        );

    }


    /* =====================================================
       PROFILBEARBEITUNG
    ===================================================== */

    function openFamilyProfileEditor(
        profile
    ) {

        closeFamilyProfileEditor();


        const overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "misaira-family-profile-editor";


        overlay.innerHTML = `

            <div
                class="mfpe-backdrop"
                data-mfpe-close
            ></div>

            <div
                class="mfpe-dialog"
                role="dialog"
                aria-modal="true"
            >

                <div
                    class="mfpe-header"
                >

                    <div>

                        <div
                            class="mfpe-label"
                        >
                            FAMILIENPROFIL
                        </div>

                        <h2>
                            ${
                                profile.id
                                    ? "Profil bearbeiten"
                                    : "Profil hinzufügen"
                            }
                        </h2>

                    </div>

                    <button
                        type="button"
                        class="mfpe-close"
                        data-mfpe-close
                    >
                        ×
                    </button>

                </div>


                <div
                    class="mfpe-avatar-preview"
                    id="mfpeAvatarPreview"
                >

                    ${
                        profile.avatarPreview
                            ? `
                                <img
                                    src="${escape(
                                        profile.avatarPreview
                                    )}"
                                    alt=""
                                >
                              `
                            : `
                                <span>
                                    ${
                                        escape(
                                            (
                                                profile.display_name ||
                                                "F"
                                            ).charAt(0)
                                        )
                                    }
                                </span>
                              `
                    }

                </div>


                <label
                    class="mfpe-upload"
                >

                    📷 Profilbild auswählen

                    <input
                        type="file"
                        id="mfpeAvatar"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        hidden
                    >

                </label>


                <label
                    class="mfpe-field"
                >

                    <span>
                        Name
                    </span>

                    <input
                        id="mfpeName"
                        type="text"
                        value="${escape(
                            profile.display_name
                        )}"
                        placeholder="Name"
                    >

                </label>


                <label
                    class="mfpe-field"
                >

                    <span>
                        Familienrolle
                    </span>

                    <input
                        id="mfpeRole"
                        type="text"
                        value="${escape(
                            profile.family_role
                        )}"
                        placeholder="z. B. Mama, Papa, Ich"
                    >

                </label>


                <label
                    class="mfpe-field"
                >

                    <span>
                        Geburtstag
                    </span>

                    <input
                        id="mfpeBirthday"
                        type="date"
                        value="${escape(
                            profile.birth_date ||
                            ""
                        )}"
                    >

                </label>


                <label
                    class="mfpe-field"
                >

                    <span>
                        Farbe
                    </span>

                    <select
                        id="mfpeColor"
                    >

                        <option
                            value="Cyan"
                            ${
                                profile.favorite_color ===
                                "Cyan"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Cyan
                        </option>

                        <option
                            value="Lila"
                            ${
                                profile.favorite_color ===
                                "Lila"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Lila
                        </option>

                        <option
                            value="Pink"
                            ${
                                profile.favorite_color ===
                                "Pink"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Pink
                        </option>

                        <option
                            value="Blau"
                            ${
                                profile.favorite_color ===
                                "Blau"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Blau
                        </option>

                        <option
                            value="Magenta"
                            ${
                                profile.favorite_color ===
                                "Magenta"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Magenta
                        </option>

                        <option
                            value="Türkis"
                            ${
                                profile.favorite_color ===
                                "Türkis"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Türkis
                        </option>

                    </select>

                </label>


                <label
                    class="mfpe-field"
                >

                    <span>
                        Hobbys
                    </span>

                    <input
                        id="mfpeHobbies"
                        type="text"
                        value="${escape(
                            profile.hobbies
                        )}"
                        placeholder="z. B. Fußball, Gaming, Lesen"
                    >

                </label>


                <div
                    class="mfpe-actions"
                >

                    <button
                        type="button"
                        class="mfpe-cancel"
                        data-mfpe-close
                    >
                        Abbrechen
                    </button>

                    <button
                        type="button"
                        class="mfpe-save"
                        id="mfpeSave"
                    >
                        PROFIL SPEICHERN
                    </button>

                </div>

            </div>
        `;


        document.body.appendChild(
            overlay
        );


        const fileInput =
            overlay.querySelector(
                "#mfpeAvatar"
            );


        let selectedFile =
            null;


        fileInput.addEventListener(
            "change",
            function () {

                selectedFile =
                    fileInput.files &&
                    fileInput.files[0]
                        ? fileInput.files[0]
                        : null;


                if (!selectedFile) {

                    return;

                }


                const reader =
                    new FileReader();


                reader.onload =
                    function () {

                        const preview =
                            overlay.querySelector(
                                "#mfpeAvatarPreview"
                            );


                        preview.innerHTML =
                            `
                                <img
                                    src="${reader.result}"
                                    alt=""
                                >
                            `;

                    };


                reader.readAsDataURL(
                    selectedFile
                );

            }
        );


        overlay
            .querySelectorAll(
                "[data-mfpe-close]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        closeFamilyProfileEditor
                    );

                }
            );


        overlay
            .querySelector(
                "#mfpeSave"
            )
            .addEventListener(
                "click",
                async function () {

                    const saveButton =
                        overlay.querySelector(
                            "#mfpeSave"
                        );


                    const name =
                        overlay
                            .querySelector(
                                "#mfpeName"
                            )
                            .value
                            .trim();


                    const role =
                        overlay
                            .querySelector(
                                "#mfpeRole"
                            )
                            .value
                            .trim();


                    const birthday =
                        overlay
                            .querySelector(
                                "#mfpeBirthday"
                            )
                            .value;


                    const color =
                        overlay
                            .querySelector(
                                "#mfpeColor"
                            )
                            .value;


                    const hobbies =
                        overlay
                            .querySelector(
                                "#mfpeHobbies"
                            )
                            .value
                            .trim();


                    if (!name) {

                        alert(
                            "Bitte einen Namen eingeben."
                        );

                        return;

                    }


                    saveButton.disabled =
                        true;

                    saveButton.textContent =
                        "SPEICHERE...";


                    try {

                        let record = {

                            ...profile,

                            display_name:
                                name,

                            family_role:
                                role ||
                                "Familienmitglied",

                            birth_date:
                                birthday ||
                                null,

                            favorite_color:
                                color,

                            hobbies:
                                hobbies ||
                                null,

                            updated_at:
                                new Date()
                                    .toISOString()

                        };


                        /*
                         * Neues Profil
                         */

                        if (!record.id) {

                            const {
                                data,
                                error
                            } =
                                await supabaseClient
                                    .from(
                                        "family_profiles"
                                    )
                                    .insert({

                                        family_id:
                                            familyId(),

                                        display_name:
                                            record.display_name,

                                        family_role:
                                            record.family_role,

                                        birth_date:
                                            record.birth_date,

                                        favorite_color:
                                            record.favorite_color,

                                        hobbies:
                                            record.hobbies

                                    })
                                    .select()
                                    .single();


                            if (error) {

                                throw error;

                            }


                            record =
                                data;

                        }


                        /*
                         * Profilbild hochladen
                         */

                        if (
                            selectedFile
                        ) {

                            const extension =
                                (
                                    selectedFile.name
                                        .split(".")
                                        .pop() ||
                                    "jpg"
                                )
                                .toLowerCase();


                            const path =
                                familyId() +
                                "/" +
                                record.id +
                                "." +
                                extension;


                            const {
                                error:
                                    uploadError
                            } =
                                await supabaseClient
                                    .storage
                                    .from(
                                        BUCKET
                                    )
                                    .upload(
                                        path,
                                        selectedFile,
                                        {
                                            cacheControl:
                                                "3600",
                                            upsert:
                                                true,
                                            contentType:
                                                selectedFile.type
                                        }
                                    );


                            if (
                                uploadError
                            ) {

                                throw uploadError;

                            }


                            record.avatar_path =
                                path;

                        }


                        /*
                         * Profil dauerhaft speichern
                         */

                        const {
                            error:
                                updateError
                        } =
                            await supabaseClient
                                .from(
                                    "family_profiles"
                                )
                                .update({

                                    display_name:
                                        record.display_name,

                                    family_role:
                                        record.family_role,

                                    birth_date:
                                        record.birth_date,

                                    favorite_color:
                                        record.favorite_color,

                                    hobbies:
                                        record.hobbies,

                                    avatar_path:
                                        record.avatar_path ||
                                        null,

                                    updated_at:
                                        new Date()
                                            .toISOString()

                                })
                                .eq(
                                    "id",
                                    record.id
                                );


                        if (
                            updateError
                        ) {

                            throw updateError;

                        }


                        closeFamilyProfileEditor();


                        await renderSavedFamilyProfiles();

                    }
                    catch (error) {

                        console.error(
                            "MISAIRA Profil speichern:",
                            error
                        );


                        alert(
                            "Das Profil konnte nicht gespeichert werden."
                        );


                        saveButton.disabled =
                            false;

                        saveButton.textContent =
                            "PROFIL SPEICHERN";

                    }

                }
            );

    }


    function closeFamilyProfileEditor() {

        const editor =
            document.getElementById(
                "misaira-family-profile-editor"
            );


        if (editor) {

            editor.remove();

        }

    }


    /* =====================================================
       GESPEICHERTE PROFILE RENDERN
    ===================================================== */

    async function renderSavedFamilyProfiles() {

        if (observerBusy) {

            return;

        }


        const container =
            document.querySelector(
                ".misaira-familyprofiles"
            );


        if (!container) {

            return;

        }


        observerBusy =
            true;


        try {

            const profiles =
                await ensureFamilyProfiles();


            const cards =
                container.querySelector(
                    ".misaira-familyprofiles-list"
                );


            if (!cards) {

                return;

            }


            let html =
                "";


            for (
                const profile of profiles
            ) {

                const avatarUrl =
                    await getAvatarUrl(
                        profile.avatar_path
                    );


                const accent =
                    getAccent(
                        profile.favorite_color
                    );


                const age =
                    calculateAge(
                        profile.birth_date
                    );


                html += `

                    <article
                        class="misaira-familyprofile-card"
                        style="
                            --profile-accent:${accent};
                        "
                        data-family-profile-id="${profile.id}"
                    >

                        <div
                            class="misaira-familyprofile-avatar"
                        >

                            ${
                                avatarUrl
                                    ? `
                                        <img
                                            src="${escape(
                                                avatarUrl
                                            )}"
                                            alt=""
                                        >
                                      `
                                    : `
                                        <span
                                            class="misaira-familyprofile-initial"
                                        >
                                            ${escape(
                                                (
                                                    profile.display_name ||
                                                    "F"
                                                ).charAt(0)
                                            )}
                                        </span>
                                      `
                            }

                            <button
                                type="button"
                                class="misaira-familyprofile-camera"
                                data-family-profile-camera="${profile.id}"
                            >
                                📷
                            </button>

                        </div>


                        <div
                            class="misaira-familyprofile-info"
                        >

                            <div
                                class="misaira-familyprofile-name"
                            >
                                ${escape(
                                    profile.display_name
                                )}
                            </div>


                            <div
                                class="misaira-familyprofile-role"
                            >
                                ${escape(
                                    profile.family_role
                                )}
                            </div>


                            ${
                                profile.birth_date
                                    ? `
                                        <div
                                            class="misaira-familyprofile-detail"
                                        >
                                            <span
                                                class="misaira-familyprofile-detail-icon"
                                            >
                                                ▣
                                            </span>

                                            <span>
                                                ${formatBirthday(
                                                    profile.birth_date
                                                )}
                                                ${
                                                    age
                                                        ? ` (${age})`
                                                        : ""
                                                }
                                            </span>
                                        </div>
                                      `
                                    : ""
                            }


                            <div
                                class="misaira-familyprofile-detail"
                            >

                                <span
                                    class="misaira-familyprofile-detail-icon"
                                >
                                    ◉
                                </span>

                                <span>
                                    Farbe:
                                    ${escape(
                                        profile.favorite_color
                                    )}
                                </span>

                            </div>


                            ${
                                profile.hobbies
                                    ? `
                                        <div
                                            class="misaira-familyprofile-detail"
                                        >

                                            <span
                                                class="misaira-familyprofile-detail-icon"
                                            >
                                                ☆
                                            </span>

                                            <span>
                                                Hobbys:
                                                ${escape(
                                                    profile.hobbies
                                                )}
                                            </span>

                                        </div>
                                      `
                                    : ""
                            }

                        </div>


                        <div
                            class="misaira-familyprofile-actions"
                        >

                            <button
                                type="button"
                                class="misaira-familyprofile-edit"
                                data-family-profile-edit="${profile.id}"
                                title="Profil bearbeiten"
                            >
                                ✎
                            </button>

                            <span
                                class="misaira-familyprofile-arrow"
                            >
                                ›
                            </span>

                        </div>

                    </article>

                `;

            }


            cards.innerHTML =
                html;


            bindFamilyProfileButtons(
                profiles
            );

        }
        finally {

            observerBusy =
                false;

        }

    }


    /* =====================================================
       BUTTONS
    ===================================================== */

    function bindFamilyProfileButtons(
        profiles
    ) {

        document
            .querySelectorAll(
                "[data-family-profile-edit]"
            )
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            const id =
                                button.dataset
                                    .familyProfileEdit;


                            const profile =
                                profiles.find(
                                    item =>
                                        item.id ===
                                        id
                                );


                            if (profile) {

                                openFamilyProfileEditor(
                                    profile
                                );

                            }

                        };

                }
            );


        document
            .querySelectorAll(
                "[data-family-profile-camera]"
            )
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            const id =
                                button.dataset
                                    .familyProfileCamera;


                            const profile =
                                profiles.find(
                                    item =>
                                        item.id ===
                                        id
                                );


                            if (profile) {

                                openFamilyProfileEditor(
                                    profile
                                );

                            }

                        };

                }
            );

    }


    /* =====================================================
       PROFIL HINZUFÜGEN
    ===================================================== */

    function bindAddButton() {

        const button =
            document.querySelector(
                "[data-familyprofile-add]"
            );


        if (!button) {

            return;

        }


        button.onclick =
            function () {

                openFamilyProfileEditor({

                    id: "",

                    display_name: "",

                    family_role:
                        "Familienmitglied",

                    birth_date: "",

                    favorite_color:
                        "Cyan",

                    hobbies: "",

                    avatar_path: ""

                });

            };

    }


    /* =====================================================
       STYLE FÜR EDITOR
    ===================================================== */

    function addEditorStyle() {

        if (
            document.getElementById(
                "misaira-family-profile-editor-style"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "misaira-family-profile-editor-style";


        style.textContent = `

            #misaira-family-profile-editor{
                position:fixed;
                inset:0;
                z-index:99999;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:20px;
            }

            .mfpe-backdrop{
                position:absolute;
                inset:0;
                background:rgba(0,0,15,.82);
                backdrop-filter:blur(8px);
            }

            .mfpe-dialog{
                position:relative;
                z-index:2;
                width:100%;
                max-width:520px;
                max-height:90vh;
                overflow:auto;
                padding:22px;
                border:1px solid rgba(0,220,255,.22);
                border-radius:20px;
                background:
                    linear-gradient(
                        145deg,
                        rgba(7,20,45,.98),
                        rgba(9,3,30,.98)
                    );
                box-shadow:
                    0 0 50px rgba(80,20,255,.25);
            }

            .mfpe-header{
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:15px;
                margin-bottom:18px;
            }

            .mfpe-label{
                color:#00eaff;
                font-size:9px;
                letter-spacing:.16em;
            }

            .mfpe-header h2{
                margin:5px 0 0;
                color:#fff;
                font-size:23px;
            }

            .mfpe-close{
                width:38px;
                height:38px;
                border:1px solid rgba(255,255,255,.15);
                border-radius:50%;
                color:#fff;
                background:rgba(255,255,255,.05);
                font-size:22px;
            }

            .mfpe-avatar-preview{
                width:105px;
                height:105px;
                margin:4px auto 12px;
                display:flex;
                align-items:center;
                justify-content:center;
                overflow:hidden;
                border:3px solid #00eaff;
                border-radius:50%;
                background:#061126;
                color:#fff;
                font-size:38px;
                box-shadow:
                    0 0 25px rgba(0,234,255,.35);
            }

            .mfpe-avatar-preview img{
                width:100%;
                height:100%;
                object-fit:cover;
            }

            .mfpe-upload{
                display:block;
                width:max-content;
                max-width:100%;
                margin:0 auto 18px;
                padding:9px 14px;
                border:1px solid rgba(190,70,255,.45);
                border-radius:9px;
                color:#e8d5ff;
                background:rgba(130,40,220,.12);
                font-size:10px;
                cursor:pointer;
            }

            .mfpe-field{
                display:block;
                margin-top:12px;
            }

            .mfpe-field span{
                display:block;
                margin-bottom:6px;
                color:#00eaff;
                font-size:9px;
                letter-spacing:.1em;
            }

            .mfpe-field input,
            .mfpe-field select{
                width:100%;
                min-height:44px;
                padding:0 12px;
                border:1px solid rgba(0,200,255,.15);
                border-radius:10px;
                outline:none;
                color:#edf4ff;
                background:#050d1e;
                font:inherit;
            }

            .mfpe-field input:focus,
            .mfpe-field select:focus{
                border-color:#00eaff;
                box-shadow:0 0 15px rgba(0,234,255,.08);
            }

            .mfpe-actions{
                display:flex;
                gap:10px;
                margin-top:20px;
            }

            .mfpe-cancel,
            .mfpe-save{
                flex:1;
                min-height:46px;
                border-radius:10px;
                font:inherit;
                cursor:pointer;
            }

            .mfpe-cancel{
                border:1px solid rgba(255,255,255,.12);
                color:#c7d0df;
                background:rgba(255,255,255,.04);
            }

            .mfpe-save{
                border:0;
                color:#fff;
                background:
                    linear-gradient(
                        90deg,
                        #00bff5,
                        #5c38ff,
                        #e11cff
                    );
                box-shadow:
                    0 0 20px rgba(120,50,255,.22);
            }

            @media(max-width:560px){
                .mfpe-dialog{
                    padding:17px;
                    border-radius:16px;
                }

                .mfpe-header h2{
                    font-size:20px;
                }
            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* =====================================================
       ÜBERWACHEN
       Der vorhandene Punkt-14-Renderer bleibt bestehen.
       Sobald er die Familienprofilseite erzeugt,
       ersetzen wir nur die Demo-Karten durch die
       dauerhaft gespeicherten Daten.
    ===================================================== */

    function startObserver() {

        const target =
            document.getElementById(
                "settingsDetailContent"
            );


        if (!target) {

            return;

        }


        const observer =
            new MutationObserver(
                function () {

                    const page =
                        document.querySelector(
                            ".misaira-familyprofiles"
                        );


                    if (!page) {

                        return;

                    }


                    if (
                        page.dataset
                            .point14Hydrated ===
                        "yes"
                    ) {

                        return;

                    }


                    page.dataset
                        .point14Hydrated =
                        "yes";


                    bindAddButton();

                    renderSavedFamilyProfiles();

                }
            );


        observer.observe(
            target,
            {
                childList: true,
                subtree: true
            }
        );

    }


    /* =====================================================
       START
    ===================================================== */

    addEditorStyle();

    startObserver();

})();

/* =========================================================
   MISAIRA PUNKT 1
   ESSENSPLAN – TEIL 1
   STYLE
========================================================= */

(function () {

    "use strict";

    if (
        document.getElementById(
            "misaira-mealplan-style"
        )
    ) {
        return;
    }


    const style =
        document.createElement("style");


    style.id =
        "misaira-mealplan-style";


    style.textContent = `

/* =========================================================
   ESSENSPLAN
========================================================= */

.misaira-mealplan {

    width: 100%;
    max-width: 900px;
    margin: 0 auto;

    color: #edf4ff;

}


/* HEADER */

.misaira-mealplan-header {

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 12px;

    margin-bottom: 18px;

}


.misaira-mealplan-heading {

    display: flex;

    align-items: center;

    gap: 12px;

}


.misaira-mealplan-icon {

    width: 48px;
    height: 48px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 14px;

    color: #00eaff;

    background:
        linear-gradient(
            145deg,
            rgba(0,234,255,.18),
            rgba(130,40,255,.25)
        );

    border:
        1px solid
        rgba(0,234,255,.45);

    box-shadow:
        0 0 25px
        rgba(0,234,255,.16);

    font-size: 24px;

}


.misaira-mealplan-heading h2 {

    margin: 0;

    color: #f5f8ff;

    font-size: 24px;

}


.misaira-mealplan-heading p {

    margin: 4px 0 0;

    color: #91a0b7;

    font-size: 10px;

}


/* ADD BUTTON */

.misaira-mealplan-add {

    min-height: 42px;

    padding:
        0 15px;

    border:
        1px solid
        rgba(170,70,255,.6);

    border-radius: 10px;

    color: #fff;

    background:
        linear-gradient(
            90deg,
            rgba(70,35,180,.8),
            rgba(170,40,235,.78)
        );

    box-shadow:
        0 0 20px
        rgba(150,40,255,.18);

    font-size: 10px;

    cursor: pointer;

}


/* WEEK NAVIGATION */

.misaira-mealplan-week {

    display: flex;

    align-items: center;

    justify-content: space-between;

    gap: 8px;

    margin-bottom: 12px;

}


.misaira-mealplan-week-button {

    width: 40px;
    height: 40px;

    flex: 0 0 40px;

    display: flex;

    align-items: center;
    justify-content: center;

    border:
        1px solid
        rgba(0,220,255,.18);

    border-radius: 10px;

    color: #00eaff;

    background:
        rgba(0,160,220,.06);

    font-size: 20px;

    cursor: pointer;

}


.misaira-mealplan-week-title {

    flex: 1;

    text-align: center;

}


.misaira-mealplan-week-title strong {

    display: block;

    color: #fff;

    font-size: 14px;

}


.misaira-mealplan-week-title span {

    display: block;

    margin-top: 3px;

    color: #8391a8;

    font-size: 9px;

}


/* DAY SELECTOR */

.misaira-mealplan-days {

    display: grid;

    grid-template-columns:
        repeat(7, 1fr);

    gap: 5px;

    margin-bottom: 14px;

}


.misaira-mealplan-day {

    min-height: 58px;

    padding: 7px 3px;

    display: flex;

    flex-direction: column;

    align-items: center;
    justify-content: center;

    border:
        1px solid
        rgba(100,150,210,.13);

    border-radius: 10px;

    color: #8d9ab0;

    background:
        rgba(7,18,38,.62);

    cursor: pointer;

}


.misaira-mealplan-day-name {

    font-size: 8px;

    text-transform:
        uppercase;

}


.misaira-mealplan-day-number {

    margin-top: 5px;

    color: #e7edf7;

    font-size: 15px;

    font-weight: 600;

}


.misaira-mealplan-day.active {

    border-color:
        rgba(0,234,255,.7);

    color: #00eaff;

    background:
        linear-gradient(
            145deg,
            rgba(0,180,220,.18),
            rgba(110,35,230,.18)
        );

    box-shadow:
        0 0 18px
        rgba(0,210,255,.12);

}


.misaira-mealplan-day.active
.misaira-mealplan-day-number {

    color: #fff;

    text-shadow:
        0 0 12px
        rgba(0,234,255,.6);

}


/* MEAL AREA */

.misaira-mealplan-content {

    display: flex;

    flex-direction: column;

    gap: 9px;

}


/* MEAL CARD */

.misaira-meal-card {

    position: relative;

    display: flex;

    align-items: center;

    gap: 14px;

    min-height: 92px;

    padding: 12px 14px;

    overflow: hidden;

    border:
        1px solid
        rgba(90,150,210,.14);

    border-radius: 13px;

    background:
        linear-gradient(
            145deg,
            rgba(5,22,43,.9),
            rgba(3,10,27,.96)
        );

}


.misaira-meal-card::before {

    content: "";

    position: absolute;

    left: 0;
    top: 8px;
    bottom: 8px;

    width: 3px;

    border-radius:
        0 4px 4px 0;

    background:
        linear-gradient(
            180deg,
            #00eaff,
            #9b35ff
        );

    box-shadow:
        0 0 13px
        rgba(0,234,255,.5);

}


/* FOOD ICON */

.misaira-meal-icon {

    width: 56px;
    height: 56px;

    flex: 0 0 56px;

    display: flex;

    align-items: center;
    justify-content: center;

    border-radius: 14px;

    background:
        linear-gradient(
            145deg,
            rgba(0,210,255,.12),
            rgba(140,40,255,.16)
        );

    border:
        1px solid
        rgba(0,220,255,.16);

    font-size: 27px;

}


/* MEAL INFORMATION */

.misaira-meal-info {

    flex: 1;

    min-width: 0;

}


.misaira-meal-name {

    color: #f5f8ff;

    font-size: 15px;

    font-weight: 600;

}


.misaira-meal-note {

    margin-top: 5px;

    color: #8e9bb0;

    font-size: 9px;

    line-height: 1.45;

}


.misaira-meal-family {

    display: inline-block;

    margin-top: 7px;

    padding:
        3px 7px;

    border-radius: 5px;

    color: #00eaff;

    background:
        rgba(0,234,255,.08);

    font-size: 8px;

}


/* ACTIONS */

.misaira-meal-actions {

    display: flex;

    align-items: center;

    gap: 6px;

}


.misaira-meal-action {

    width: 38px;
    height: 38px;

    display: flex;

    align-items: center;
    justify-content: center;

    border:
        1px solid
        rgba(130,170,220,.14);

    border-radius: 50%;

    color: #aebbd0;

    background:
        rgba(255,255,255,.025);

    font-size: 15px;

    cursor: pointer;

}


.misaira-meal-action:hover {

    color: #00eaff;

    border-color:
        rgba(0,234,255,.45);

}


/* EMPTY STATE */

.misaira-mealplan-empty {

    min-height: 190px;

    display: flex;

    flex-direction: column;

    align-items: center;
    justify-content: center;

    padding: 20px;

    border:
        1px dashed
        rgba(0,210,255,.18);

    border-radius: 14px;

    color: #8c9ab0;

    background:
        rgba(4,14,30,.55);

    text-align: center;

}


.misaira-mealplan-empty-icon {

    margin-bottom: 10px;

    color: #00eaff;

    font-size: 38px;

    text-shadow:
        0 0 20px
        rgba(0,234,255,.45);

}


.misaira-mealplan-empty strong {

    color: #e8eef8;

    font-size: 13px;

}


.misaira-mealplan-empty span {

    max-width: 300px;

    margin-top: 6px;

    font-size: 9px;

    line-height: 1.5;

}


/* MOBILE */

@media (max-width: 600px) {

    .misaira-mealplan-header {

        align-items:
            flex-start;

    }


    .misaira-mealplan-heading h2 {

        font-size: 20px;

    }


    .misaira-mealplan-add {

        padding:
            0 10px;

        font-size: 9px;

    }


    .misaira-mealplan-days {

        gap: 3px;

    }


    .misaira-mealplan-day {

        min-height: 52px;

    }


    .misaira-meal-card {

        min-height: 82px;

        gap: 10px;

        padding:
            10px;

    }


    .misaira-meal-icon {

        width: 48px;
        height: 48px;

        flex-basis: 48px;

        font-size: 22px;

    }


    .misaira-meal-name {

        font-size: 13px;

    }


    .misaira-meal-note {

        font-size: 8px;

    }


    .misaira-meal-action {

        width: 34px;
        height: 34px;

    }

}

`;

    document.head.appendChild(
        style
    );

})();

/* =========================================================
   MISAIRA PUNKT 1
   ESSENSPLAN – TEIL 2
   STRUKTUR + SIDEBAR
========================================================= */

(function () {

    "use strict";


    function renderMisairaMealPlan() {

        const content =
            document.getElementById(
                "settingsDetailContent"
            );

        const main =
            document.getElementById(
                "settingsMain"
            );

        const sub =
            document.getElementById(
                "settingsSubPage"
            );


        if (!content || !main || !sub) {

            console.error(
                "MISAIRA: Essensplan-Container nicht gefunden."
            );

            return;

        }


        main.classList.add("hidden");
        sub.classList.remove("hidden");


        content.innerHTML = `

            <div class="misaira-mealplan">


                <div
                    class="misaira-mealplan-header"
                >

                    <div
                        class="misaira-mealplan-heading"
                    >

                        <div
                            class="misaira-mealplan-icon"
                        >
                            🍽️
                        </div>

                        <div>

                            <h2>
                                Essensplan
                            </h2>

                            <p>
                                Euer Familienplan für die Woche
                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        class="misaira-mealplan-add"
                        data-meal-add
                    >
                        ＋ Essen hinzufügen
                    </button>

                </div>


                <div
                    class="misaira-mealplan-week"
                >

                    <button
                        type="button"
                        class="misaira-mealplan-week-button"
                        data-meal-prev
                    >
                        ‹
                    </button>


                    <div
                        class="misaira-mealplan-week-title"
                    >

                        <strong
                            data-meal-week-title
                        >
                            Diese Woche
                        </strong>

                        <span
                            data-meal-date-title
                        >
                            Familien-Essensplan
                        </span>

                    </div>


                    <button
                        type="button"
                        class="misaira-mealplan-week-button"
                        data-meal-next
                    >
                        ›
                    </button>

                </div>


                <div
                    class="misaira-mealplan-days"
                    data-meal-days
                ></div>


                <div
                    class="misaira-mealplan-content"
                    data-meal-content
                ></div>


            </div>

        `;


        renderMealDays();

    }


    /* =====================================================
       TAGE
    ===================================================== */

    function renderMealDays() {

        const container =
            document.querySelector(
                "[data-meal-days]"
            );


        if (!container) {

            return;

        }


        const days = [

            ["Mo", "Montag"],
            ["Di", "Dienstag"],
            ["Mi", "Mittwoch"],
            ["Do", "Donnerstag"],
            ["Fr", "Freitag"],
            ["Sa", "Samstag"],
            ["So", "Sonntag"]

        ];


        const today =
            new Date()
                .getDay();


        const currentDay =
            today === 0
                ? 6
                : today - 1;


        let html = "";


        days.forEach(
            function (day, index) {

                html += `

                    <button
                        type="button"
                        class="
                            misaira-mealplan-day
                            ${
                                index === currentDay
                                    ? "active"
                                    : ""
                            }
                        "
                        data-meal-day="${index}"
                    >

                        <span
                            class="
                                misaira-mealplan-day-name
                            "
                        >
                            ${day[0]}
                        </span>

                        <span
                            class="
                                misaira-mealplan-day-number
                            "
                        >
                            ${day[1].charAt(0)}
                        </span>

                    </button>

                `;

            }
        );


        container.innerHTML =
            html;


        container
            .querySelectorAll(
                "[data-meal-day]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            container
                                .querySelectorAll(
                                    ".misaira-mealplan-day"
                                )
                                .forEach(
                                    function (item) {

                                        item.classList.remove(
                                            "active"
                                        );

                                    }
                                );


                            button.classList.add(
                                "active"
                            );


                            renderSelectedMealDay(
                                Number(
                                    button.dataset
                                        .mealDay
                                )
                            );

                        }
                    );

                }
            );


        renderSelectedMealDay(
            currentDay
        );

    }


    /* =====================================================
       AUSGEWÄHLTEN TAG
    ===================================================== */

    function renderSelectedMealDay(
        dayIndex
    ) {

        const content =
            document.querySelector(
                "[data-meal-content]"
            );


        if (!content) {

            return;

        }


        const dayNames = [

            "Montag",
            "Dienstag",
            "Mittwoch",
            "Donnerstag",
            "Freitag",
            "Samstag",
            "Sonntag"

        ];


        const dayName =
            dayNames[dayIndex] ||
            "Heute";


        const meals = {

            0: [
                {
                    icon: "🍝",
                    name: "Spaghetti Bolognese",
                    note:
                        "Tomatensoße, Hackfleisch und Parmesan"
                }
            ],

            1: [
                {
                    icon: "🍗",
                    name: "Hähnchen mit Reis",
                    note:
                        "Gemüse und Kräuter"
                }
            ],

            2: [
                {
                    icon: "🥘",
                    name: "Familien-Gemüsepfanne",
                    note:
                        "Buntes Gemüse mit Kartoffeln"
                }
            ],

            3: [
                {
                    icon: "🍕",
                    name: "Pizza",
                    note:
                        "Familien-Pizza nach Wunsch"
                }
            ],

            4: [
                {
                    icon: "🌮",
                    name: "Tacos",
                    note:
                        "Salat, Gemüse und Käse"
                }
            ],

            5: [
                {
                    icon: "🍔",
                    name: "Burger",
                    note:
                        "Burger mit Ofenkartoffeln"
                }
            ],

            6: [
                {
                    icon: "🥞",
                    name: "Pfannkuchen",
                    note:
                        "Mit Obst oder Apfelmus"
                }
            ]

        };


        const selected =
            meals[dayIndex] || [];


        if (!selected.length) {

            content.innerHTML = `

                <div
                    class="misaira-mealplan-empty"
                >

                    <div
                        class="
                            misaira-mealplan-empty-icon
                        "
                    >
                        🍽️
                    </div>

                    <strong>
                        Für ${dayName} ist noch
                        kein Essen geplant.
                    </strong>

                    <span>
                        Füge ein Gericht hinzu,
                        damit die ganze Familie
                        den Plan sehen kann.
                    </span>

                </div>

            `;

            return;

        }


        let html = "";


        selected.forEach(
            function (meal, index) {

                html += `

                    <article
                        class="misaira-meal-card"
                    >

                        <div
                            class="misaira-meal-icon"
                        >
                            ${meal.icon}
                        </div>


                        <div
                            class="misaira-meal-info"
                        >

                            <div
                                class="misaira-meal-name"
                            >
                                ${meal.name}
                            </div>

                            <div
                                class="misaira-meal-note"
                            >
                                ${meal.note}
                            </div>

                            <span
                                class="misaira-meal-family"
                            >
                                👨‍👩‍👧‍👦 Familie
                            </span>

                        </div>


                        <div
                            class="misaira-meal-actions"
                        >

                            <button
                                type="button"
                                class="misaira-meal-action"
                                title="Bearbeiten"
                                data-meal-edit="${index}"
                            >
                                ✎
                            </button>

                            <button
                                type="button"
                                class="misaira-meal-action"
                                title="Löschen"
                                data-meal-delete="${index}"
                            >
                                ×
                            </button>

                        </div>

                    </article>

                `;

            }
        );


        content.innerHTML =
            html;

    }


    /* =====================================================
       ESSENSPLAN ÖFFNEN
    ===================================================== */

    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    "[data-settings-page]"
                );


            if (!button) {

                return;

            }


            if (
    button.dataset.settingsPage !== "mealplan" &&
    button.dataset.page !== "mealplan"
) {
    return;
            }


            event.preventDefault();

            event.stopImmediatePropagation();


            renderMisairaMealPlan();

        },
        true
    );


    /*
     * Für den Sidebar-Reiter verfügbar machen.
     */

    window.renderMisairaMealPlan =
        renderMisairaMealPlan;


})();

/* =========================================================
   MISAIRA PUNKT 1
   ESSENSPLAN – TEIL 3
   HINZUFÜGEN + BEARBEITEN + LÖSCHEN + SPEICHERN
========================================================= */

(function () {

    "use strict";

    let selectedMealDate =
        new Date();

    let currentMeals = [];


    function getFamilyId() {

        return (
            typeof state !== "undefined" &&
            state.user &&
            state.user.family_id
        ) || "";

    }


    function dateString(date) {

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return (
            year +
            "-" +
            month +
            "-" +
            day
        );

    }


    function escapeMeal(value) {

        return String(
            value || ""
        )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    }


    /* =====================================================
       TAGE AUSWÄHLEN
    ===================================================== */

    function getMonday(date) {

        const result =
            new Date(date);

        const day =
            result.getDay();

        const difference =
            day === 0
                ? -6
                : 1 - day;

        result.setDate(
            result.getDate() +
            difference
        );

        result.setHours(
            0, 0, 0, 0
        );

        return result;

    }


    function renderWeekDays() {

        const container =
            document.querySelector(
                "[data-meal-days]"
            );

        if (!container) {
            return;
        }


        const monday =
            getMonday(
                selectedMealDate
            );


        const names = [
            "Mo",
            "Di",
            "Mi",
            "Do",
            "Fr",
            "Sa",
            "So"
        ];


        let html = "";


        for (
            let i = 0;
            i < 7;
            i++
        ) {

            const date =
                new Date(monday);

            date.setDate(
                monday.getDate() +
                i
            );


            const active =
                dateString(date) ===
                dateString(
                    selectedMealDate
                );


            html += `

                <button
                    type="button"
                    class="
                        misaira-mealplan-day
                        ${active ? "active" : ""}
                    "
                    data-meal-real-date="${dateString(date)}"
                >

                    <span
                        class="
                            misaira-mealplan-day-name
                        "
                    >
                        ${names[i]}
                    </span>

                    <span
                        class="
                            misaira-mealplan-day-number
                        "
                    >
                        ${date.getDate()}
                    </span>

                </button>

            `;

        }


        container.innerHTML =
            html;


        container
            .querySelectorAll(
                "[data-meal-real-date]"
            )
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            selectedMealDate =
                                new Date(
                                    button.dataset
                                        .mealRealDate +
                                    "T00:00:00"
                                );

                            renderWeekDays();

                            loadMeals();

                        };

                }
            );

    }


    /* =====================================================
       WOCHENTITEL
    ===================================================== */

    function updateWeekTitle() {

        const title =
            document.querySelector(
                "[data-meal-week-title]"
            );

        const dateTitle =
            document.querySelector(
                "[data-meal-date-title]"
            );


        if (title) {

            title.textContent =
                "Familien-Essensplan";

        }


        if (dateTitle) {

            dateTitle.textContent =
                selectedMealDate.toLocaleDateString(
                    "de-DE",
                    {
                        weekday: "long",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric"
                    }
                );

        }

    }


    /* =====================================================
       ESSEN LADEN
    ===================================================== */

    async function loadMeals() {

        const content =
            document.querySelector(
                "[data-meal-content]"
            );


        if (!content) {
            return;
        }


        const familyId =
            getFamilyId();


        if (!familyId) {

            content.innerHTML = `

                <div
                    class="misaira-mealplan-empty"
                >

                    <div
                        class="
                            misaira-mealplan-empty-icon
                        "
                    >
                        🍽️
                    </div>

                    <strong>
                        Noch keine Familie verbunden
                    </strong>

                    <span>
                        Verbinde zuerst dein Familienkonto,
                        damit der Essensplan gespeichert
                        werden kann.
                    </span>

                </div>

            `;

            return;

        }


        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "family_meals"
                )
                .select("*")
                .eq(
                    "family_id",
                    familyId
                )
                .eq(
                    "meal_date",
                    dateString(
                        selectedMealDate
                    )
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (error) {

            console.error(
                "MISAIRA Essensplan laden:",
                error
            );

            content.innerHTML = `

                <div
                    class="misaira-mealplan-empty"
                >

                    <div
                        class="
                            misaira-mealplan-empty-icon
                        "
                    >
                        ⚠️
                    </div>

                    <strong>
                        Essensplan konnte nicht geladen werden.
                    </strong>

                </div>

            `;

            return;

        }


        currentMeals =
            data || [];


        renderMeals();

    }


    /* =====================================================
       ESSEN ANZEIGEN
    ===================================================== */

    function renderMeals() {

        const content =
            document.querySelector(
                "[data-meal-content]"
            );


        if (!content) {
            return;
        }


        if (!currentMeals.length) {

            content.innerHTML = `

                <div
                    class="misaira-mealplan-empty"
                >

                    <div
                        class="
                            misaira-mealplan-empty-icon
                        "
                    >
                        🍽️
                    </div>

                    <strong>
                        Noch kein Essen geplant
                    </strong>

                    <span>
                        Füge für diesen Tag
                        ein Gericht hinzu.
                    </span>

                </div>

            `;

            return;

        }


        let html = "";


        currentMeals.forEach(
            function (meal) {

                html += `

                    <article
                        class="misaira-meal-card"
                    >

                        <div
                            class="misaira-meal-icon"
                        >
                            ${escapeMeal(
                                meal.icon
                            )}
                        </div>


                        <div
                            class="misaira-meal-info"
                        >

                            <div
                                class="misaira-meal-name"
                            >
                                ${escapeMeal(
                                    meal.title
                                )}
                            </div>

                            ${
                                meal.note
                                    ? `
                                        <div
                                            class="misaira-meal-note"
                                        >
                                            ${escapeMeal(
                                                meal.note
                                            )}
                                        </div>
                                      `
                                    : ""
                            }

                            <span
                                class="misaira-meal-family"
                            >
                                👨‍👩‍👧‍👦 Familie
                            </span>

                        </div>


                        <div
                            class="misaira-meal-actions"
                        >

                            <button
                                type="button"
                                class="misaira-meal-action"
                                data-edit-meal="${meal.id}"
                                title="Bearbeiten"
                            >
                                ✎
                            </button>

                            <button
                                type="button"
                                class="misaira-meal-action"
                                data-delete-meal="${meal.id}"
                                title="Löschen"
                            >
                                ×
                            </button>

                        </div>

                    </article>

                `;

            }
        );


        content.innerHTML =
            html;


        bindMealActions();

    }


    /* =====================================================
       HINZUFÜGEN / BEARBEITEN
    ===================================================== */

    function openMealEditor(
        meal = null
    ) {

        const old =
            document.getElementById(
                "misaira-meal-editor"
            );


        if (old) {
            old.remove();
        }


        const overlay =
            document.createElement(
                "div"
            );


        overlay.id =
            "misaira-meal-editor";


        overlay.innerHTML = `

            <div
                class="mme-backdrop"
                data-mme-close
            ></div>


            <div
                class="mme-dialog"
            >

                <div
                    class="mme-header"
                >

                    <div>

                        <small>
                            FAMILIEN-ESSENSPLAN
                        </small>

                        <h2>
                            ${
                                meal
                                    ? "Essen bearbeiten"
                                    : "Essen hinzufügen"
                            }
                        </h2>

                    </div>


                    <button
                        type="button"
                        class="mme-close"
                        data-mme-close
                    >
                        ×
                    </button>

                </div>


                <label
                    class="mme-field"
                >

                    <span>
                        Gericht
                    </span>

                    <input
                        id="mmeTitle"
                        type="text"
                        value="${escapeMeal(
                            meal
                                ? meal.title
                                : ""
                        )}"
                        placeholder="z. B. Spaghetti Bolognese"
                    >

                </label>


                <label
                    class="mme-field"
                >

                    <span>
                        Notiz
                    </span>

                    <textarea
                        id="mmeNote"
                        placeholder="Zutaten oder kurze Notiz"
                    >${escapeMeal(
                        meal
                            ? meal.note
                            : ""
                    )}</textarea>

                </label>


                <label
                    class="mme-field"
                >

                    <span>
                        Symbol
                    </span>

                    <select
                        id="mmeIcon"
                    >

                        <option value="🍽️">🍽️ Essen</option>
                        <option value="🍝">🍝 Pasta</option>
                        <option value="🍕">🍕 Pizza</option>
                        <option value="🍔">🍔 Burger</option>
                        <option value="🍗">🍗 Fleisch</option>
                        <option value="🥗">🥗 Salat</option>
                        <option value="🥘">🥘 Pfanne</option>
                        <option value="🌮">🌮 Tacos</option>
                        <option value="🥞">🥞 Pfannkuchen</option>
                        <option value="🍲">🍲 Suppe</option>
                        <option value="🥪">🥪 Sandwich</option>

                    </select>

                </label>


                <div
                    class="mme-actions"
                >

                    <button
                        type="button"
                        class="mme-cancel"
                        data-mme-close
                    >
                        Abbrechen
                    </button>


                    <button
                        type="button"
                        class="mme-save"
                        id="mmeSave"
                    >
                        SPEICHERN
                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            overlay
        );


        const icon =
            overlay.querySelector(
                "#mmeIcon"
            );


        if (meal && meal.icon) {

            icon.value =
                meal.icon;

        }


        overlay
            .querySelectorAll(
                "[data-mme-close]"
            )
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            overlay.remove();

                        };

                }
            );


        overlay
            .querySelector(
                "#mmeSave"
            )
            .onclick =
            async function () {

                const title =
                    overlay
                        .querySelector(
                            "#mmeTitle"
                        )
                        .value
                        .trim();


                const note =
                    overlay
                        .querySelector(
                            "#mmeNote"
                        )
                        .value
                        .trim();


                const selectedIcon =
                    overlay
                        .querySelector(
                            "#mmeIcon"
                        )
                        .value;


                if (!title) {

                    alert(
                        "Bitte ein Gericht eingeben."
                    );

                    return;

                }


                const save =
                    overlay
                        .querySelector(
                            "#mmeSave"
                        );


                save.disabled =
                    true;

                save.textContent =
                    "SPEICHERE...";


                try {

                    const familyId =
                        getFamilyId();


                    if (!familyId) {

                        throw new Error(
                            "Keine Familie verbunden."
                        );

                    }


                    const payload = {

                        family_id:
                            familyId,

                        meal_date:
                            dateString(
                                selectedMealDate
                            ),

                        title:
                            title,

                        note:
                            note ||
                            null,

                        icon:
                            selectedIcon,

                        created_by:
                            state &&
                            state.user
                                ? state.user.id
                                : null,

                        updated_at:
                            new Date()
                                .toISOString()

                    };


                    if (meal) {

                        const {
                            error
                        } =
                            await supabaseClient
                                .from(
                                    "family_meals"
                                )
                                .update(
                                    payload
                                )
                                .eq(
                                    "id",
                                    meal.id
                                );


                        if (error) {
                            throw error;
                        }

                    }
                    else {

                        const {
                            error
                        } =
                            await supabaseClient
                                .from(
                                    "family_meals"
                                )
                                .insert(
                                    payload
                                );


                        if (error) {
                            throw error;
                        }

                    }


                    overlay.remove();

                    await loadMeals();

                }
                catch (error) {

                    console.error(
                        "MISAIRA Essen speichern:",
                        error
                    );


                    alert(
                        "Das Essen konnte nicht gespeichert werden."
                    );


                    save.disabled =
                        false;

                    save.textContent =
                        "SPEICHERN";

                }

            };

    }


    /* =====================================================
       LÖSCHEN
    ===================================================== */

    async function deleteMeal(
        id
    ) {

        if (
            !confirm(
                "Möchtest du dieses Essen wirklich löschen?"
            )
        ) {

            return;

        }


        const {
            error
        } =
            await supabaseClient
                .from(
                    "family_meals"
                )
                .delete()
                .eq(
                    "id",
                    id
                );


        if (error) {

            console.error(
                "MISAIRA Essen löschen:",
                error
            );

            alert(
                "Das Essen konnte nicht gelöscht werden."
            );

            return;

        }


        await loadMeals();

    }


    /* =====================================================
       AKTIONEN
    ===================================================== */

    function bindMealActions() {

        document
            .querySelectorAll(
                "[data-edit-meal]"
            )
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            const meal =
                                currentMeals.find(
                                    item =>
                                        item.id ===
                                        button.dataset
                                            .editMeal
                                );


                            if (meal) {

                                openMealEditor(
                                    meal
                                );

                            }

                        };

                }
            );


        document
            .querySelectorAll(
                "[data-delete-meal]"
            )
            .forEach(
                function (button) {

                    button.onclick =
                        function () {

                            deleteMeal(
                                button.dataset
                                    .deleteMeal
                            );

                        };

                }
            );

    }


    /* =====================================================
       NEUES ESSEN
    ===================================================== */

    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    "[data-meal-add]"
                );


            if (!button) {
                return;
            }


            openMealEditor();

        }
    );


    /* =====================================================
       WOCHEN-NAVIGATION
    ===================================================== */

    document.addEventListener(
        "click",
        function (event) {

            const previous =
                event.target.closest(
                    "[data-meal-prev]"
                );


            const next =
                event.target.closest(
                    "[data-meal-next]"
                );


            if (
                !previous &&
                !next
            ) {

                return;

            }


            selectedMealDate =
                new Date(
                    selectedMealDate
                );


            selectedMealDate.setDate(
                selectedMealDate.getDate() +
                (
                    previous
                        ? -7
                        : 7
                )
            );


            renderWeekDays();

            updateWeekTitle();

            loadMeals();

        }
    );


    /* =====================================================
       EDITOR STYLE
    ===================================================== */

    if (
        !document.getElementById(
            "misaira-meal-editor-style"
        )
    ) {

        const style =
            document.createElement(
                "style"
            );


        style.id =
            "misaira-meal-editor-style";


        style.textContent = `

            #misaira-meal-editor{
                position:fixed;
                inset:0;
                z-index:99999;
                display:flex;
                align-items:center;
                justify-content:center;
                padding:18px;
            }

            .mme-backdrop{
                position:absolute;
                inset:0;
                background:rgba(0,0,18,.84);
                backdrop-filter:blur(8px);
            }

            .mme-dialog{
                position:relative;
                z-index:2;
                width:100%;
                max-width:500px;
                padding:21px;
                border:1px solid rgba(0,220,255,.2);
                border-radius:18px;
                background:
                    linear-gradient(
                        145deg,
                        rgba(7,20,45,.98),
                        rgba(11,3,31,.98)
                    );
                box-shadow:
                    0 0 45px
                    rgba(90,40,255,.25);
            }

            .mme-header{
                display:flex;
                align-items:flex-start;
                justify-content:space-between;
                gap:12px;
                margin-bottom:18px;
            }

            .mme-header small{
                color:#00eaff;
                font-size:8px;
                letter-spacing:.15em;
            }

            .mme-header h2{
                margin:5px 0 0;
                color:#fff;
                font-size:21px;
            }

            .mme-close{
                width:36px;
                height:36px;
                border:1px solid rgba(255,255,255,.12);
                border-radius:50%;
                color:#fff;
                background:rgba(255,255,255,.04);
                font-size:21px;
            }

            .mme-field{
                display:block;
                margin-top:12px;
            }

            .mme-field span{
                display:block;
                margin-bottom:6px;
                color:#00eaff;
                font-size:9px;
            }

            .mme-field input,
            .mme-field textarea,
            .mme-field select{
                box-sizing:border-box;
                width:100%;
                padding:11px 12px;
                border:1px solid rgba(0,210,255,.15);
                border-radius:9px;
                outline:none;
                color:#edf4ff;
                background:#040c1d;
                font:inherit;
            }

            .mme-field textarea{
                min-height:85px;
                resize:vertical;
            }

            .mme-field input:focus,
            .mme-field textarea:focus,
            .mme-field select:focus{
                border-color:#00eaff;
                box-shadow:
                    0 0 15px
                    rgba(0,234,255,.08);
            }

            .mme-actions{
                display:flex;
                gap:9px;
                margin-top:20px;
            }

            .mme-cancel,
            .mme-save{
                flex:1;
                min-height:44px;
                border-radius:9px;
                cursor:pointer;
                font:inherit;
            }

            .mme-cancel{
                border:1px solid rgba(255,255,255,.12);
                color:#c7d0df;
                background:rgba(255,255,255,.04);
            }

            .mme-save{
                border:0;
                color:#fff;
                background:
                    linear-gradient(
                        90deg,
                        #00bff5,
                        #5b3bff,
                        #df20ff
                    );
                box-shadow:
                    0 0 18px
                    rgba(100,50,255,.22);
            }

        `;


        document.head.appendChild(
            style
        );

    }


    /* =====================================================
       START
    ===================================================== */

    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    "[data-settings-page]"
                );


            if (!button) {
                return;
            }


            if (
                button.dataset.settingsPage !==
                "mealplan"
            ) {
                return;
            }


            setTimeout(
                function () {

                    selectedMealDate =
                        new Date();

                    renderWeekDays();

                    updateWeekTitle();

                    loadMeals();

                },
                0
            );

        }
    );


})();

/* =========================================================
   MISAIRA PUNKT 1
   ESSENSPLAN – SIDEBAR VERBINDUNG
========================================================= */

(function () {

    "use strict";

    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    '[data-page="mealplan"]'
                );

            if (!button) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (
                typeof window.renderMisairaMealPlan !==
                "function"
            ) {

                console.error(
                    "MISAIRA: renderMisairaMealPlan nicht gefunden."
                );

                return;

            }

            window.renderMisairaMealPlan();

        },
        true
    );

})();
