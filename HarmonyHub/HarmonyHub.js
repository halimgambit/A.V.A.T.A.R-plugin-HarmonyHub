import Harmony from "harmony-websocket";

let harmony;

export async function init() {
    const ip = Config.modules.HarmonyHub.ip;
    harmony = new Harmony();

    harmony.on("open", () => info("Harmony connecté"));

    harmony.on("close", async () => {
        warn("Harmony déconnecté");
        try {
            await harmony.connect(ip);
        } catch (err) {
            error("Reconnexion Harmony échouée:", err);
        }
    });

    await Avatar.lang.addPluginPak('HarmonyHub');

    try {
        await harmony.connect(ip);
    } catch (err) {
        error("Harmony connexion:", err);
    }
}

export async function action(data, callback){

    const toClient = data.toClient || data.client;

    const L = await Avatar.lang.getPak('HarmonyHub', data.language);

    try {
    
        const tblActions = {
            startTV: () => startActivity("Regarder la TV", data.client, toClient, L),
            startPS: () => startActivity("PlayStation", data.client, toClient, L),
            powerOff: () => powerOffAction(data.client, toClient, L),
            startNetflix: () => startActivity("Netflix", data.client, toClient, L),
            currentActivity: () => currentActivityAction(data.client, toClient, L)
        };

        info("HarmonyHub:", data.action.command, L.get("plugin.from"), data.client, L.get("plugin.to"), data.toClient);

        if (tblActions[data.action.command]) {
            await tblActions[data.action.command]();
        }

    } catch (err) {
        if (data.client) Avatar.Speech.end(data.client);
        if (err.message) error(err.message);
    }   

    callback();
}

const startActivity = async (name, client, toClient, L) => {
    try {
        const activities = await harmony.getActivities();
        const activity = activities.find(a => a.label.toLowerCase().includes(name.toLowerCase()));
        if(!activity){
            Avatar.speak(L.get("speech.noActivity"), client, () => Avatar.Speech.end(client));
            return;
        }
        await harmony.startActivity(activity.id);
        Avatar.speak(L.get(["speech.startActivity", activity.label]), client, () => Avatar.Speech.end(client),);
    } catch(err) {
        error("Harmony startActivity:", err);
        Avatar.speak(L.get("speech.errorApi"), client, () => Avatar.Speech.end(client));
    }
}

const powerOffAction = async (client, toClient, L) => {
    try {
        await harmony.startActivity("-1");
        Avatar.speak(L.get("speech.powerOff"), client, () => Avatar.Speech.end(client));
    } catch(err) {
        error("Harmony powerOff:", err);
    }
}

const currentActivityAction = async (client, L) => {
    try {
        const activity = await harmony.getCurrentActivity();
        if(activity === "-1"){
            Avatar.speak(L.get("speech.noCurrentActivity"), client, () => Avatar.Speech.end(client));
        } else {
            const activities = await harmony.getActivities();
            const current = activities.find(a => a.id === activity);
            if (current) {
                Avatar.speak(L.get("speech.yesCurrentActivity", current.label), client, () => Avatar.Speech.end(client));
            } else {
                Avatar.speak(L.get("speech.noNameCurrentActivity"), client, () => Avatar.Speech.end(client));
            }
        }
    } catch(err) {
        error("Harmony currentActivity:", err);
    }
}
