# -*- coding: utf-8 -*-
# Snippet table: (key, file, first_line, last_line, lang, heading, explanation_html)

GAME = [
 ("g1","minitalks-frontend/src/pages/GamePage.jsx",1514,1547,"javascript",
  "Lip sync: loudness becomes a mouth shape",
  "<p>The child speaks into the microphone; the Mini on screen moves its mouth. One number &mdash; "
  "<code>audioLevel</code>, 0&ndash;1 &mdash; is mapped onto fourteen mouth frames inside Three.js's "
  "per&#8209;frame callback.</p>"
  "<p>Two details matter. The level is read from a <em>ref</em>, not a prop, because <code>useFrame</code> "
  "closes over its props once and would otherwise keep reading the first value forever. And a change is "
  "allowed only every 80&nbsp;ms: at 60&nbsp;fps the mouth would otherwise flicker faster than a face can "
  "move, which children read as broken rather than as speech.</p>"
  "<p>The thresholds are tighter at the quiet end (0.05, 0.10, 0.15&hellip;) and wider at the top, because "
  "a shy voice lives in the bottom third of the range &mdash; a linear mapping leaves a whispering child "
  "with a motionless face.</p>"),

 ("g2","minitalks-frontend/src/pages/GamePage.jsx",4376,4396,"javascript",
  "Where that number comes from",
  "<p>The Web Audio API, not a library. <code>getUserMedia</code> opens the microphone, an "
  "<code>AnalyserNode</code> with <code>fftSize&nbsp;=&nbsp;256</code> gives 128 frequency bins, and the "
  "mean of those bins divided by 128 is the 0&ndash;1 level the mouth reads.</p>"
  "<p>The Safari line is a bug fix that stayed: on iOS an <code>AudioContext</code> created outside a user "
  "gesture starts <code>suspended</code> and never produces a sample, so the meter sat at zero on every "
  "iPad. It is resumed explicitly.</p>"
  "<p>The same stream feeds a <code>MediaRecorder</code>, so the recording the parent later hears and the "
  "animation the child sees come from one microphone pass.</p>"),

 ("g3","minitalks-frontend/src/pages/GamePage.jsx",5550,5569,"javascript",
  "The 3D stage, tuned for school hardware",
  "<p>react&#8209;three&#8209;fiber's <code>&lt;Canvas&gt;</code> with the renderer configured by hand. "
  "<code>dpr={[1,&nbsp;2]}</code> caps the pixel ratio at 2&times; &mdash; the comment records that 3&times; "
  "was tried and was far too heavy on the tablets this is actually used on.</p>"
  "<p><code>failIfMajorPerformanceCaveat:&nbsp;false</code> keeps the scene running on machines with no "
  "GPU acceleration instead of showing a blank canvas, which is the difference between working and not "
  "working in a school computer room.</p>"
  "<p>Soft shadows, sRGB output and per&#8209;scene tone mapping are set in <code>onCreated</code>, so the "
  "colour pipeline is defined in exactly one place.</p>"),

 ("g4","minitalks-frontend/src/pages/GamePage.jsx",2312,2328,"javascript",
  "A beard that does not eat the mouth",
  "<p>Minis can be given facial hair, and the beard model contains the mouth geometry too. Left alone, a "
  "bearded Mini stopped moving its lips.</p>"
  "<p>So on load each mesh in the model is sorted by name: anything reading as "
  "<code>facialhair</code>/<code>beard</code>/<code>mustache</code> is tagged a beard, everything else a "
  "mouth. The lip&#8209;sync code then hides the mouth meshes and keeps the beard while the fourteen "
  "animated frames play underneath.</p>"
  "<p>It is a small thing that protects a large one: a child who chose a beard still sees their Mini "
  "talk.</p>"),

 ("g5","minitalks-frontend/src/pages/Sceneselectionpage.jsx",258,274,"javascript",
  "Locks a parent controls, with a safe fallback",
  "<p>Scenes and the four difficulty levels (sound, word, sentence, dialogue) unlock under adult control, "
  "not by score. A child who is not ready for a dialogue is not pushed into one.</p>"
  "<p>This is the offline path: when the API cannot be reached the page still renders a usable board from "
  "a local scene table. The unlock priority is explicit &mdash; everything unlocked, else the first "
  "<em>n</em>, else just the first &mdash; so a network failure degrades to \"scene one is playable\" "
  "rather than to an empty screen or, worse, everything unlocked.</p>"),

 ("g6","minitalks-frontend/src/api/axios.js",12,32,"javascript",
  "One place that knows about the token",
  "<p>Every call in the app goes through this Axios instance. A request interceptor attaches the bearer "
  "token; a response interceptor catches <code>401</code>, clears the stored session and returns the user "
  "to the login page.</p>"
  "<p>The value is that no page component contains auth code. An expired session cannot leave one screen "
  "showing stale data while another redirects &mdash; the behaviour is identical everywhere because it is "
  "written once.</p>"),

 ("g7","minitalks-api/rewards/add-reward.php",56,79,"php",
  "The daily limit, inside the transaction",
  "<p>Rewards are the motivation engine, so they are also the thing most easily broken. The check runs "
  "inside <code>beginTransaction()</code>: the count of today's rewards and the insert that follows cannot "
  "be split by a second request, which is how a double&#8209;tap used to award two bricks.</p>"
  "<p>The limit itself is a parent setting (unlimited, 3 or 5 a day), read per Mini. Every statement is a "
  "prepared statement with bound parameters &mdash; there is no string&#8209;built SQL anywhere in the "
  "reward path.</p>"),

 ("g8","minitalks-api/rewards/add-reward.php",107,145,"php",
  "Bricks into medals, computed not counted",
  "<p>Bricks become medals at a rate the parent chooses (5, 10 or 20). The naive version &mdash; subtract "
  "bricks and add a medal &mdash; loses medals whenever a request is retried or arrives twice.</p>"
  "<p>This version derives the answer instead: how many medals <em>should</em> exist at this brick total, "
  "minus how many were already converted, found by matching the note the converter itself writes. If the "
  "two agree, nothing happens. Running it twice is harmless, which is what makes it safe behind a flaky "
  "school connection.</p>"
  "<p>Medals roll into cups by the same rule immediately below, so one ladder covers brick &rarr; medal "
  "&rarr; cup.</p>"),

 ("g9","minitalks-api/missions/complete-mission.php",44,60,"php",
  "Writing to two tables without double counting",
  "<p>Daily missions moved from <code>mission_completions</code> to <code>mission_assignments</code> part "
  "way through the project, and older installations still read the first table.</p>"
  "<p>Rather than break them, the endpoint writes both &mdash; but it looks first, keyed on "
  "<code>(mini, mission, date)</code>, so completing a mission twice in one day cannot produce two rows "
  "and two bricks. The comment names the reason the second write exists, which is the part that is hard to "
  "recover six months later.</p>"),

 ("g10","minitalks-api/auth/login.php",123,131,"php",
  "Passwords, and identical answers",
  "<p>Passwords are stored as PHP <code>password_hash</code> digests and checked with "
  "<code>password_verify</code> &mdash; never compared, never reversible, and the algorithm can be "
  "upgraded without a migration.</p>"
  "<p>The wrong&#8209;password and no&#8209;such&#8209;user branches return the same status and the same "
  "sentence. That is deliberate: different wording tells a stranger which e&#8209;mail addresses belong to "
  "families using the app.</p>"
  "<p>A deactivated account gets its own <code>403</code> with an explanation, because that user needs to "
  "know why.</p>"),
]

FORUM = [
 ("f1","mini-forum/includes/class-mini-forum-design.php",1027,1042,"php",
  "Editable blocks: escape first, then fill in",
  "<p>The whole site is editable from one Design page. An area is stored HTML; "
  "<code>render()</code> is what puts it on a page.</p>"
  "<p>The order is the point. A text area is escaped, an HTML area is run through "
  "<code>wp_kses</code> against an explicit allow&#8209;list &mdash; and only <em>after</em> that are the "
  "<code>{{tokens}}</code> replaced with values the plugin itself produced. Substituting first would let "
  "an editor's paste be re&#8209;interpreted as markup; this way nothing an editor types can become a "
  "tag, and nothing the plugin inserts gets mangled by the sanitiser.</p>"),

 ("f2","mini-forum/includes/class-mini-forum-design.php",1745,1757,"php",
  "The fix for \"the photo saves but nothing changes\"",
  "<p>Reported by the client in exactly those words. People do not paste a URL into an image field &mdash; "
  "they paste what their browser gave them, usually a whole <code>&lt;img src=\"&hellip;\"&gt;</code> tag. "
  "<code>sanitize_text_field</code> dutifully stripped the tag and stored an empty string, so the save "
  "succeeded and the picture did not change.</p>"
  "<p>Now, when a field's own default is a URL, the saver digs the address out of a pasted tag &mdash; "
  "<code>src</code> or <code>href</code>, else the first bare URL &mdash; and stores that. The field "
  "accepts what people actually paste, and still stores only a validated URL.</p>"),

 ("f3","mini-forum/includes/class-mini-forum-events.php",167,182,"php",
  "One column, two kinds of description",
  "<p>Event descriptions are typed in an admin form by some people and pasted out of a word processor by "
  "others. The column holds both. Escaping everything printed raw "
  "<code>&lt;p style=&hellip;&gt;</code> on the page &mdash; which is what visitors were reading.</p>"
  "<p>So the text is sniffed: markup goes down the sanitising path, typed text down the paragraph path. "
  "The <code>mf_events_details</code> filter at the end means a site can override the whole decision "
  "without editing the plugin.</p>"),

 ("f4","mini-forum/includes/class-mini-forum-events.php",203,215,"php",
  "Accepting a paste without accepting its styling",
  "<p>Pasted HTML is run through WordPress's own post allow&#8209;list with three attributes removed: "
  "<code>style</code>, <code>align</code> and <code>bgcolor</code>. Those are exactly the attributes a "
  "word processor leaves behind, and they are what makes a pasted paragraph fight the site's design.</p>"
  "<p>The structure survives; the foreign typography does not. If the paste has no block wrapper at all, "
  "<code>wpautop</code> gives it paragraphs so it does not arrive as one wall of text.</p>"),

 ("f5","mini-forum/includes/class-mini-forum-events.php",351,355,"php",
  "Four bullet colours in the designer's order",
  "<p>Event bullets run yellow, red, blue, green &mdash; but not as a plain cycle. The delivered designs "
  "repeat them as 1,2,3,4,2,1,4,3, which reads as hand&#8209;placed rather than mechanical, and that is "
  "what was shipped.</p>"
  "<p>The order is a filter, so it can be changed without touching the loop, and each bullet is itself an "
  "editable Design block rather than a hard&#8209;coded image.</p>"),

 ("f6","mini-forum/includes/class-mini-forum-game.php",146,163,"php",
  "The forum talking to the game",
  "<p>A forum member links their game account by proving they can read the inbox the game account is "
  "registered to &mdash; no game password is ever typed into WordPress, and no password crosses between "
  "the two systems.</p>"
  "<p>This is the call that carries it: a shared key in <code>X&#8209;Forum&#8209;Key</code>, a hard "
  "refusal to send that key over plain HTTP (localhost excepted, so the thing can be developed), a "
  "timeout, and JSON in both directions. The guard exists because without it a mistyped "
  "<code>http://</code> in a settings field would put the shared key and the one&#8209;time token on the "
  "wire in clear text.</p>"),

 ("f7","mini-forum/assets/js/mt-header.js",246,258,"javascript",
  "A handler that knows when to stand down",
  "<p>The header ships as a plugin script, but the site also still carries a hand&#8209;pasted copy in "
  "places. Both ran on the same click: the page's own handler opened the profile menu, and this one, "
  "finding no menu it had drawn, closed everything. The symptom was a profile photo that did "
  "nothing.</p>"
  "<p>The fix is three lines and a comment: if this pill is not one we drew, return and let the other "
  "script own it. The whole header is bound by delegation from <code>document</code> and scoped with "
  "<code>closest('.mt-header')</code> for the same reason &mdash; the same widget is on the page more than "
  "once, so nothing may be found by <code>id</code>.</p>"),

 ("f8","mini-forum/assets/css/mini-events.css",559,566,"css",
  "Why the categories are classes and not inline styles",
  "<p>Every event category has a colour: workshops red, family days yellow, expert sessions blue, updates "
  "green, special days orange. All five rendered blue.</p>"
  "<p>The cause was WordPress, not CSS. <code>safecss_filter_attr</code> keeps only known CSS properties "
  "in a <code>style</code> attribute, and a custom property such as <code>--c</code> is not one of them, "
  "so every inline colour was silently dropped. Moved into classes, the palette is out of that filter's "
  "reach &mdash; and it becomes one readable list instead of a value repeated through the markup.</p>"),
]

DEVICES = [
 ("d1","mini-devices/assets/mini-devices.js",306,336,"javascript",
  "Connecting to a physical kit from a web page",
  "<p>No driver, no installer: WebSerial. <code>requestPort()</code> shows the browser's own chooser, the "
  "port opens at 115200 baud, and a read loop starts.</p>"
  "<p>The 1800&nbsp;ms wait is measured, not guessed. Asserting DTR resets the ESP32&#8209;S3, and the "
  "board takes about a second and a half to come back; talking to it earlier gets silence. Then the chain "
  "is explicit &mdash; say hello, confirm who owns the kit, set its clock, pull its statistics &mdash; and "
  "the status line tells the user which step they are on.</p>"),

 ("d2","mini-devices/assets/mini-devices.js",280,292,"javascript",
  "Four tries, because USB is not reliable",
  "<p>A kit that is still booting, or whose first reply was lost, used to look like a broken kit. "
  "<code>hello</code> is asked up to four times with a 2.5&nbsp;s window and a 700&nbsp;ms gap, and the "
  "attempt counter is shown to the user so the wait is legible rather than a frozen page.</p>"
  "<p>A reply counts only if it carries <code>\"dev\"</code>. Boot&#8209;loader chatter and the firmware's "
  "own <code>#</code> log lines are therefore not mistaken for a handshake.</p>"),

 ("d3","mini-devices/assets/mini-devices.js",363,402,"javascript",
  "Whose kit is this?",
  "<p>Kits are shared &mdash; between siblings, or around a classroom. The firmware stores the profile it "
  "is bound to, and the site compares that with the signed&#8209;in profile.</p>"
  "<p>Three cases, each handled out loud: already yours, unbound (offer to link it), or someone else's "
  "(name them and ask before taking it). The prompt promises that recordings stay on the kit, because the "
  "fear it answers is a child losing their voice recordings when a sibling plugs it in. Nothing is "
  "rebound without a human saying yes, and the first branch keeps older firmware with no "
  "<code>uid</code> working in read&#8209;only form instead of rejecting it.</p>"),

 ("d4","mini-devices/assets/mini-devices.js",2170,2175,"javascript",
  "Scene numbers read as names",
  "<p>The firmware stores audio in folders named <code>scene_1</code>, <code>scene_2</code>. Nobody thinks "
  "in those terms, so the shelf shows <q>Classroom (Scene&nbsp;1)</q>.</p>"
  "<p>The map is merged over <code>MD.sceneNames</code>, so a new scene in the game is named on the site "
  "by adding one line from outside the plugin &mdash; and an unknown number still renders as "
  "<q>Scene&nbsp;7</q> rather than as a blank.</p>"),

 ("d5","mini-devices/includes/class-md-design.php",45,53,"php",
  "A default written once, read twice",
  "<p>The picture on each kit card is editable, which means there are two places a default can live: the "
  "fallback the renderer uses and the value the Design page offers. When two copies exist they drift, and "
  "a card ends up showing something nobody chose &mdash; which is exactly what happened.</p>"
  "<p>One constant now feeds both, as the comment records. The bug cannot come back without deleting the "
  "constant.</p>"),

 ("d6","mini-devices/assets/mini-devices.js",1783,1795,"javascript",
  "Disconnect, requested by the client",
  "<p>Until this was added there was no way to let go of a kit short of unplugging it, and parents were "
  "reasonably unsure whether unplugging would lose anything.</p>"
  "<p>The button releases the serial port, re&#8209;renders the shelf and the open panel, and says the "
  "one thing that was worrying people: the kit stays on your profile. The confirmation is written in the "
  "same plain register as the rest of the interface &mdash; no state is lost, and pressing Connect picks "
  "up where it left off.</p>"),
]

FIRMWARE = [
 ("k1","mini-kits-firmware/Version_F/F_versiyon/F_versiyon.ino",1428,1444,"cpp",
  "A handshake that keeps its old names",
  "<p>The kit answers <code>hello</code> with who it is, what it runs and whether it is bound to a "
  "profile. The duplication is deliberate and the comment says why: the website recognises a kit by the "
  "<code>dev</code> key and gives up after four tries, while an older tool reads "
  "<code>device_id</code>/<code>profile_id</code>/<code>profile_name</code>.</p>"
  "<p>Both sets are sent. A dozen bytes of JSON is a cheap price for not breaking a tool that is already "
  "in someone's hands &mdash; and <code>time_valid</code> lets the site know, without asking, that the "
  "clock still needs setting.</p>"),

 ("k2","mini-kits-firmware/Version_F/F_versiyon/F_versiyon.ino",1551,1563,"cpp",
  "Meeting the other side's spelling halfway",
  "<p>The firmware's own protocol calls the field <code>profile_id</code>; the website sends "
  "<code>profile</code>. Rather than make either side wrong, <code>bind</code> accepts both, and the same "
  "for <code>profile_name</code>/<code>owner</code>.</p>"
  "<p>Every command replies with an explicit <code>ok</code> and, on failure, a named reason &mdash; "
  "<code>profile_id_missing</code> is a message someone can act on, where silence is a kit that appears "
  "dead. The binding is written to flash, so it survives a power cycle.</p>"),

 ("k3","mini-kits-firmware/Version_B/BrickTalks_S3/BrickTalks_S3.ino",798,820,"cpp",
  "Validating a face pack before trusting it",
  "<p>Mouth animations are uploaded to the kit as an <code>MTF1</code> pack: a base image plus up to "
  "<em>n</em> mouth frames and the box they sit in &mdash; the same idea as the lip sync in the 3D game, "
  "shipped to a physical screen.</p>"
  "<p>A microcontroller with a few hundred kilobytes of RAM cannot survive a malformed pack, so nothing is "
  "read until the header has been checked: magic bytes, non&#8209;zero dimensions that fit the real "
  "display, a frame count within the compiled maximum, and a mouth box that lies inside the base image. "
  "Each failure returns a named reason, and the block lengths and checksums are verified before a single "
  "frame is drawn.</p>"),

 ("k4","mini-kits-firmware/Version_F/F_versiyon/F_versiyon.ino",364,388,"cpp",
  "Two independent I2S buses",
  "<p>The kit records and plays back, so the microphone and the amplifier each get their own I2S "
  "peripheral &mdash; mic on I2S0 at 32&#8209;bit mono, amplifier on I2S1 at 16&#8209;bit stereo. One "
  "shared bus would force one format on both and put a click into every transition.</p>"
  "<p>Eight DMA descriptors of 512 frames is about 256&nbsp;ms of buffer, enough that a slow flash write "
  "cannot drop samples; the comment records the arithmetic. An overflow callback is registered rather than "
  "assumed away, and the receive channel is opened only while recording, so the microphone draws nothing "
  "on battery when idle.</p>"),

 ("k5","mini-kits-firmware/Version_F/F_versiyon/F_versiyon.ino",254,288,"cpp",
  "Debounce, long press, and counting the noise",
  "<p>Large buttons pressed by small hands bounce. A change is accepted only after "
  "<code>DEBOUNCE_MS</code> of a steady reading; short presses fire on release, long presses at about "
  "800&nbsp;ms while still held, so a child never has to time anything.</p>"
  "<p><code>suppress</code> is what stops one long press also counting as a short one. The "
  "<code>glitch</code> counter is a debugging tool that stayed in: it counts raw transitions and reports "
  "them, which is how a noisy solder joint was found on an assembled kit without opening it.</p>"),

 ("k6","mini-kits-firmware/Version_F/F_versiyon/F_versiyon.ino",1354,1370,"cpp",
  "Going to sleep without waking straight back up",
  "<p>The kit sleeps on a long press of ON/OFF, or after a timeout. It shuts the microphone channel and "
  "pulls the amplifier's shutdown pin low first &mdash; an amplifier left enabled pops as the rail "
  "settles, which sounds like a fault.</p>"
  "<p>The loop in the middle is the fix for a real bug: the press that puts it to sleep is still held, so "
  "it immediately woke the kit again. It now waits for every button to be released, clears the pending "
  "events, and only then changes state.</p>"),
]
