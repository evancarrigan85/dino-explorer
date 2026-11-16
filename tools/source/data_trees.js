// ============================================================
// FAMILY TREES — who branched from whom
// ============================================================
// Each tree is a nest of branches. A branch has:
//   n      plain name                    sci    scientific name (optional)
//   step   the new feature this branch evolved, inherited by everything below it
//   note   one more sentence (optional)  debate what experts still argue about (optional)
//   paths  the lineage paths (as on the animal cards) whose animals sit on this branch
//   kids   the branches that split off from it, oldest first
//   trunk  true on the one child that carries the main line onward (drawn straight down)
//   auto   true to list every group under the path as its own folded-away twig
// An animal hangs on the branch with the longest matching path. Time ranges on the
// page are worked out from the animals in the app, not typed in here.
// Sources are attached in refs_wanted.txt with the target t:<tree id>.
const SYN = 'Proto-mammals (synapsids) › ', DN = 'Dinosaurs › ', THE = DN + 'Theropods › ', SAU = DN + 'Sauropods & kin › ', ARM = DN + 'Armoured dinosaurs › ',
  ORN = DN + 'Ornithopods › ', HOR = DN + 'Horned & dome-headed › ', EAR = DN + 'Early dinosaurs › ', FOR = 'Mammals › Mammal forerunners';
const TREES = [
  { id: 'synapsid', icon: '🦣', title: 'The road to mammals',
    intro: 'Mammals did not come from dinosaurs, or from reptiles as we know them. Their line — the synapsids — split off more than 300 million years ago and ruled the land before the dinosaurs did. Follow the trunk down: each ＋ is a new feature that every animal below it inherited, and you still carry all of them.',
    debate: 'The order in which the therapsid groups branched off is not settled, and whether the varanopids belong on this tree at all was challenged in 2020. The trunk — sail-backs, therapsids, cynodonts, mammals — is agreed.',
    root: { n: 'Synapsids', sci: 'Synapsida', step: 'One opening in the skull behind each eye. Jaw muscles could bulge through it, for a stronger bite. Yours is the hollow behind your cheekbone.', paths: [], kids: [
      { n: 'Caseids', sci: 'Caseidae', note: 'Small heads, barrel bodies: among the first big plant-eaters on land.', paths: [SYN + 'Caseids'] },
      { n: 'Varanopids', sci: 'Varanopidae', note: 'Slim, lizard-shaped hunters.', debate: 'Possibly early reptiles rather than mammal relatives.', paths: [SYN + 'Varanopids'] },
      { n: 'Ophiacodonts', sci: 'Ophiacodontidae', note: 'The oldest synapsids we know, long-snouted and often living by water.', paths: [SYN + 'Early synapsids'] },
      { n: 'Sail-backed plant-eaters', sci: 'Edaphosauridae', note: 'Their sail evolved separately from Dimetrodon’s — it has little cross-bars the hunters’ sails lack.', paths: [SYN + 'Sail-backed plant-eaters (edaphosaurs)'] },
      { trunk: true, n: 'Sail-backed hunters and their heirs', sci: 'Sphenacodontia', step: 'Teeth of different shapes for different jobs: nippers in front, long stabbing canines, slicers behind.', paths: [], kids: [
        { n: 'Sail-backed hunters', sci: 'Sphenacodontidae', note: 'Dimetrodon and its cousins — closer to you than to any dinosaur.', paths: [SYN + 'Sail-backed hunters (sphenacodonts)'] },
        { trunk: true, n: 'Therapsids', sci: 'Therapsida', step: 'Legs held more upright under the body, a bigger opening for jaw muscles, and probably a faster-running, warmer body.', paths: [SYN + 'Earliest therapsids'], kids: [
          { n: 'Biarmosuchians', sci: 'Biarmosuchia', note: 'Early, lightly built hunters.', paths: [SYN + 'Biarmosuchians'] },
          { n: 'Dinocephalians', sci: 'Dinocephalia', note: '“Terrible heads”: thick-skulled giants, the first really big land animals. Gone before the Permian ended.', paths: [SYN + 'Dinocephalians'] },
          { n: 'Beaks and tusks', sci: 'Anomodontia', note: 'The dicynodonts and their kin: the most common plant-eaters of their age, and survivors of the Great Dying.', paths: [SYN + 'Anomodonts', SYN + 'Dicynodonts'] },
          { n: 'Gorgonopsians', sci: 'Gorgonopsia', note: 'Sabre-toothed hunters, the top predators of the late Permian. None survived the Great Dying.', paths: [SYN + 'Gorgonopsians'] },
          { n: 'Therocephalians', sci: 'Therocephalia', note: '“Beast heads”: the cynodonts’ closest cousins, some possibly venomous.', paths: [SYN + 'Therocephalians'] },
          { trunk: true, n: 'Cynodonts', sci: 'Cynodontia', step: 'A bony roof to the mouth, so they could breathe while chewing. Complex cheek teeth. Fewer bones in the lower jaw.', paths: [SYN + 'Cynodonts'], kids: [
            { n: 'Early cynodonts', note: 'Small burrowers that came through the Great Dying.', paths: [SYN + 'Cynodonts › Early cynodonts'] },
            { n: 'Cynognathus and the plant-eaters', sci: 'Cynognathia', note: 'A wolf-like hunter and its many plant-eating relatives, common across the Triassic south.', paths: [SYN + 'Cynodonts › Cynognathus & kin'] },
            { n: 'Tritylodonts', sci: 'Tritylodontidae', note: 'Rodent-like plant-eaters: the last of the proto-mammals, alive well into the age of dinosaurs.', paths: [SYN + 'Cynodonts › Tritylodonts'] },
            { n: 'Near-mammals', sci: 'Brasilodontidae', note: 'Mouse-sized insect-eaters one step from the mammal line.', paths: [SYN + 'Cynodonts › Near-mammals'] },
            { trunk: true, n: 'Mammal forerunners', sci: 'Mammaliaformes', step: 'A new jaw joint. The old jaw-joint bones were freed to carry sound and became the tiny bones of the middle ear. Fur, and very probably milk.', paths: [FOR], kids: [
              { n: 'Earliest mammal relatives', note: 'Tiny animals with the new jaw joint, each with a different mix of old and new features.', paths: [FOR + ' › Earliest mammal relatives'] },
              { n: 'Morganucodonts', sci: 'Morganucodonta', note: 'Shrew-sized night hunters found from Wales to China.', paths: [FOR + ' › Morganucodonts'] },
              { n: 'Docodonts', sci: 'Docodonta', note: 'Swimmers, diggers and climbers: proof that mammal relatives tried many ways of life under the dinosaurs’ feet.', paths: [FOR + ' › Docodonts'] },
              { n: 'Gliders', sci: 'Haramiyida', note: 'Tree-living plant-eaters, some with gliding membranes.', debate: 'Whether they sit just outside the mammals or inside them is disputed.', paths: [FOR + ' › Gliders (haramiyidans)'] },
              { trunk: true, auto: true, n: 'Mammals', sci: 'Mammalia', step: 'Three tiny ear bones, in the end completely free of the jaw. One set of baby teeth, then adult teeth. A big brain for the size of the body.', note: 'Every living mammal — egg-layers, pouched mammals and placentals like us — descends from this point.', paths: ['Mammals'] },
            ] },
          ] },
        ] },
      ] },
    ] } },
  { id: 'dino', icon: '🦖', title: 'The dinosaur family tree',
    intro: 'All dinosaurs descend from one small, two-legged ancestor that lived about 240 million years ago. The family split early into three great branches — bird-hipped plant-eaters, long-necked giants, and the meat-eating theropods. Follow the theropod trunk to the bottom and you reach the birds: the dinosaurs that are still alive.',
    debate: 'How the three great branches join at the base is not settled. The long-standing view puts theropods with the long-necks (the “lizard-hipped” dinosaurs), as drawn here. A 2017 study proposed that theropods belong with the bird-hipped dinosaurs instead; a reply the same year found the old arrangement fits slightly better, but only just. Where megaraptors and the very earliest dinosaurs belong is also argued over.',
    root: { n: 'The dinosaur line', sci: 'Dinosauriformes', step: 'Long back legs held under the body, walking on the toes.', paths: [], kids: [
      { n: 'Dinosaur cousins', sci: 'Silesauridae and kin', note: 'Close relatives that lived beside the first dinosaurs — nearly dinosaurs, but not quite.', paths: ['Reptiles › Dinosaur cousins'] },
      { trunk: true, n: 'Dinosaurs', sci: 'Dinosauria', step: 'A hole right through the hip socket, with the legs held straight beneath the body — built to stand tall and run.', paths: [DN.slice(0, -3)], kids: [
        { n: 'Earliest dinosaurs', note: 'Small, two-legged and rare. Experts disagree about which branch each of these belongs to.', paths: [EAR + 'Earliest dinosaurs'] },
        { n: 'Bird-hipped dinosaurs', sci: 'Ornithischia', step: 'A hip bone pointing backwards and an extra beak bone on the tip of the lower jaw. Nearly all were plant-eaters.', note: 'Despite the name, birds did not come from this branch.', paths: [EAR + 'Early bird-hipped dinosaurs'], kids: [
          { n: 'Armoured dinosaurs', sci: 'Thyreophora', step: 'Rows of bony plates grown in the skin.', paths: [ARM + 'Early armoured dinosaurs'], kids: [
            { n: 'Stegosaurs', sci: 'Stegosauria', note: 'Plates and spikes down the back, spikes on the tail.', paths: [ARM + 'Stegosaurs'] },
            { n: 'Ankylosaurs', sci: 'Ankylosauria', step: 'Armour over the whole body, fused to the skull.', paths: [ARM + 'Early ankylosaurs'], kids: [
              { n: 'Nodosaurs', sci: 'Nodosauridae', note: 'Shoulder spikes, no tail club.', paths: [ARM + 'Nodosaurs'] },
              { n: 'Southern ankylosaurs', sci: 'Parankylosauria', note: 'A separate southern branch, some with blade-edged tails.', paths: [ARM + 'Southern ankylosaurs'] },
              { n: 'Club-tailed ankylosaurs', sci: 'Ankylosauridae', note: 'A bony club on a stiffened tail.', paths: [ARM + 'Club-tailed ankylosaurs'] },
            ] },
          ] },
          { n: 'Ornithopods', sci: 'Ornithopoda', step: 'Jaws that could chew, with teeth that kept themselves sharp as they wore.', paths: [ORN.slice(0, -3)], kids: [
            { n: 'Small ornithopods', note: 'Fast two-legged runners — the gazelles of the dinosaur world.', paths: [ORN + 'Small ornithopods'] },
            { trunk: true, n: 'Iguanodonts', sci: 'Iguanodontia', step: 'Bigger bodies and a hand that could bear weight; many had a spike for a thumb.', paths: [ORN + 'Iguanodonts'], kids: [
              { trunk: true, n: 'Duck-bills', sci: 'Hadrosauridae', step: 'Hundreds of teeth packed into grinding batteries; many had hollow head crests for calling.', paths: [ORN + 'Duck-bills (hadrosaurs)'] },
            ] },
          ] },
          { n: 'Horned and dome-headed dinosaurs', sci: 'Marginocephalia', step: 'A bony shelf at the back of the skull.', paths: [HOR.slice(0, -3)], kids: [
            { n: 'Dome-heads', sci: 'Pachycephalosauria', note: 'Skull roofs thickened into solid bone domes.', paths: [HOR + 'Dome-heads (pachycephalosaurs)'] },
            { n: 'Horned dinosaurs', sci: 'Ceratopsia', step: 'A parrot-like beak with its own extra bone.', paths: [HOR + 'Early horned dinosaurs'], kids: [
              { trunk: true, n: 'Great horned dinosaurs', sci: 'Ceratopsidae', step: 'Big horns, big frills, four legs and slicing tooth batteries.', paths: [HOR + 'Horned dinosaurs (ceratopsids)'] },
            ] },
          ] },
        ] },
        { n: 'Long-necks', sci: 'Sauropodomorpha', step: 'A small head on a long neck, with leaf-shaped teeth for stripping plants.', paths: [SAU + 'Early long-necks'], kids: [
          { trunk: true, n: 'Sauropods', sci: 'Sauropoda', step: 'Four pillar-like legs to carry the largest bodies ever to walk on land.', paths: [SAU.slice(0, -3), SAU + 'Early sauropods'], kids: [
            { n: 'Mamenchisaurs', sci: 'Mamenchisauridae', note: 'Necks making up half the animal’s length.', paths: [SAU + 'Mamenchisaurs'] },
            { n: 'Turiasaurs', sci: 'Turiasauria', note: 'European giants with heart-shaped teeth.', paths: [SAU + 'Turiasaurs'] },
            { n: 'Whip-tails', sci: 'Diplodocoidea', step: 'Pencil-shaped teeth at the front of the mouth only, and a long whip of a tail.', paths: [], kids: [
              { n: 'Rebbachisaurs', sci: 'Rebbachisauridae', note: 'Ground-level grazers with wide, straight-edged mouths.', paths: [SAU + 'Rebbachisaurs'] },
              { n: 'Dicraeosaurs', sci: 'Dicraeosauridae', note: 'Short necks for a sauropod, with tall spines.', paths: [SAU + 'Dicraeosaurs'] },
              { n: 'Diplodocids', sci: 'Diplodocidae', note: 'Diplodocus, Apatosaurus, Brontosaurus: the longest of all.', paths: [SAU + 'Diplodocids'] },
            ] },
            { trunk: true, n: 'Big-noses', sci: 'Macronaria', step: 'A nose opening bigger than the eye socket, and broader, spoon-shaped teeth.', paths: [SAU + 'Camarasaurs'], kids: [
              { n: 'Brachiosaurs', sci: 'Brachiosauridae', note: 'Front legs longer than the back: built to browse the treetops.', paths: [SAU + 'Brachiosaurs'] },
              { trunk: true, n: 'Titanosaurs', sci: 'Titanosauria and kin', step: 'A wide stance; many had bony armour in the skin. The heaviest land animals of all time.', paths: [SAU + 'Titanosaur relatives', SAU + 'Titanosaurs'] },
            ] },
          ] },
        ] },
        { trunk: true, n: 'Theropods', sci: 'Theropoda', step: 'Hollow bones, a wishbone, and three main fingers on a grasping hand.', paths: [THE.slice(0, -3)], kids: [
          { n: 'Early theropods', sci: 'Coelophysoidea and kin', note: 'Slim, long-necked hunters of the Triassic and Early Jurassic.', paths: [THE + 'Early theropods'] },
          { n: 'Ceratosaurs and abelisaurs', sci: 'Ceratosauria', note: 'Horned and short-faced hunters; in the southern continents they held on to the very end.', paths: [THE + 'Ceratosaurs & abelisaurs'] },
          { trunk: true, n: 'Stiff-tails', sci: 'Tetanurae', step: 'A stiffened tail for balance, and a hand reduced to three fingers.', paths: [], kids: [
            { n: 'Megalosaurs and spinosaurs', sci: 'Megalosauroidea', note: 'The first giant meat-eaters, and the fish-eating sail-backs that came from them.', paths: [THE + 'Megalosaurs & spinosaurs'] },
            { n: 'Allosaurs and kin', sci: 'Allosauroidea', note: 'The top hunters of the Jurassic and Early Cretaceous, including the shark-toothed giants.', paths: [THE + 'Allosaurs & kin'] },
            { n: 'Megaraptors', sci: 'Megaraptora', note: 'Long-armed hunters with huge hand claws.', debate: 'Relatives of Allosaurus, or of the tyrannosaurs? Not settled.', paths: [THE + 'Megaraptors'] },
            { trunk: true, n: 'Feathered theropods', sci: 'Coelurosauria', step: 'Feathers — at first a simple fuzz — and a bigger brain.', paths: [], kids: [
              { n: 'Small feathered hunters', sci: 'Compsognathidae and kin', note: 'Turkey-sized runners; the first dinosaurs found with fuzz.', paths: [THE + 'Small feathered hunters'] },
              { n: 'Tyrannosaurs', sci: 'Tyrannosauroidea', note: 'They began small and feathered. The giants came only in the last 20 million years of the dinosaur age.', paths: [THE + 'Tyrannosaurs'] },
              { n: 'Ostrich-mimics', sci: 'Ornithomimosauria', note: 'Toothless, long-legged sprinters.', paths: [THE + 'Ostrich-mimics'] },
              { trunk: true, n: 'Hand-folders', sci: 'Maniraptora', step: 'Long arms with a half-moon wrist bone that lets the hand fold back, the way a bird folds its wing. Feathers with a central shaft.', paths: [], kids: [
                { n: 'Alvarezsaurs', sci: 'Alvarezsauria', note: 'Small runners with stubby, one-clawed arms for digging out insects.', paths: [THE + 'Alvarezsaurs'] },
                { n: 'Therizinosaurs', sci: 'Therizinosauria', note: 'Meat-eaters’ descendants that turned to plants, with metre-long claws.', paths: [THE + 'Therizinosaurs'] },
                { n: 'Oviraptorosaurs', sci: 'Oviraptorosauria', note: 'Beaked, crested, and found sitting on their nests like birds.', paths: [THE + 'Oviraptorosaurs'] },
                { trunk: true, n: 'Winged dinosaurs', sci: 'Paraves', step: 'Long feathered wings on the arms; many also had a raised sickle claw on the second toe.', paths: [], kids: [
                  { n: 'Raptors', sci: 'Dromaeosauridae', note: 'Velociraptor and kin. Some small ones glided on four wings.', paths: [THE + 'Raptors (dromaeosaurs)'] },
                  { n: 'Troodontids', sci: 'Troodontidae', note: 'Big-eyed, big-brained night hunters.', paths: [THE + 'Troodontids'] },
                  { n: 'Near-birds', sci: 'Anchiornithidae, Scansoriopterygidae', note: 'Tiny tree-dwellers on the very edge of being birds — one with wings of skin, like a bat’s.', paths: [THE + 'Near-birds'] },
                  { trunk: true, auto: true, n: 'Birds', sci: 'Avialae', step: 'Powered flight. Later: a toothless beak, a fused tail stump, and a keeled breastbone for flight muscles.', note: 'About 11,000 kinds are alive today. Dinosaurs never died out — you can feed some in the park.', paths: ['Birds'] },
                ] },
              ] },
            ] },
          ] },
        ] },
      ] },
    ] } },
];
// Two more trees, built from the animals already in the app. A branch with `link` opens another tree.
const FI_ = 'Fishes › ', AM_ = 'Amphibians & early tetrapods › ', RE_ = 'Reptiles › ', SE_ = 'Sea reptiles › ';
TREES.push(
  { id: 'fish', icon: '🐟', title: 'From fish to four legs',
    intro: 'Every animal with a backbone — you included — is a kind of fish that changed. Follow the trunk down: jaws, then bone, then fleshy fins, then legs, then an egg that can be laid on dry land. Each ＋ is something everything below it still has.',
    debate: 'Where the spiny sharks belong (they now look like early relatives of true sharks), and whether today’s frogs and salamanders come from the temnospondyls or the lepospondyls, are both still argued. The trunk — jaws, bone, lobe-fins, limbs — is agreed.',
    root: { n: 'Animals with a backbone line', sci: 'Chordata', step: 'A stiff rod along the back, muscles in zig-zag blocks, and slits behind the head for gills.', paths: [FI_ + 'Early chordates'], kids: [
      { n: 'Jawless fishes', sci: 'Agnatha', note: 'For tens of millions of years, all fishes looked like this: no jaws, often an armoured head. Lampreys and hagfish are their survivors.', paths: [FI_ + 'Jawless fishes'] },
      { trunk: true, n: 'Fishes with jaws', sci: 'Gnathostomata', step: 'Jaws, made over from the bars that held up the gills — and paired fins, the beginnings of arms and legs.', paths: [], kids: [
        { n: 'Armoured fishes', sci: 'Placodermi', note: 'Fishes in bony armour, from small bottom-feeders to Dunkleosteus. All gone by the end of the Devonian.', paths: [FI_ + 'Armoured fishes (placoderms)'] },
        { n: 'Spiny sharks', sci: 'Acanthodii', note: 'Small fishes with a spine in front of every fin.', debate: 'Now thought to be early relatives of the true sharks.', paths: [FI_ + 'Spiny sharks'] },
        { n: 'Sharks and their kin', sci: 'Chondrichthyes', step: 'A skeleton of gristle (cartilage) instead of bone.', paths: [FI_ + 'Sharks & kin'] },
        { trunk: true, n: 'Bony fishes', sci: 'Osteichthyes', step: 'A skeleton of bone, and a sac of air in the body — a swim bladder in some, lungs in others.', paths: [], kids: [
          { n: 'Ray-finned fishes', sci: 'Actinopterygii', note: 'Fins held up by thin rays. Today nearly half of all animals with a backbone are ray-finned fishes.', paths: [FI_ + 'Ray-finned fishes'] },
          { trunk: true, n: 'Lobe-finned fishes', sci: 'Sarcopterygii', step: 'Fleshy fins built around bones: one bone, then two, then many — the plan of your own arm.', note: 'Coelacanths and lungfish are the survivors.', paths: [FI_ + 'Lobe-finned fishes'], kids: [
            { trunk: true, n: 'Fishes with limbs', sci: 'Elpistostegalia', step: 'A flat head, a neck, and bones in the fins like wrists. They could prop themselves up in the shallows.', paths: [FI_ + 'Lobe-finned fishes › Fish with limbs'], kids: [
              { trunk: true, n: 'Four-legged animals', sci: 'Tetrapoda', step: 'Legs with fingers and toes — at first seven or eight on each foot, not five.', paths: [AM_ + 'First four-legged animals', AM_ + 'Early tetrapods'], kids: [
                { n: 'Temnospondyls', sci: 'Temnospondyli', note: 'Big-headed amphibians, some as long as crocodiles. They lasted into the age of dinosaurs.', paths: [AM_ + 'Temnospondyls'] },
                { n: 'Lepospondyls', sci: 'Lepospondyli', note: 'Small and strange: some legless, one with a head shaped like a boomerang.', paths: [AM_ + 'Lepospondyls'] },
                { n: 'Today’s amphibians', sci: 'Lissamphibia', note: 'Frogs, salamanders and caecilians.', debate: 'Which of the older groups they came from is not settled.', paths: [AM_ + 'Salamanders'] },
                { n: 'Almost egg-layers', note: 'Animals close to the line that evolved the land egg — some still laid their eggs in water.', paths: [AM_ + 'Reptile-like tetrapods'] },
                { trunk: true, n: 'Egg-layers on land', sci: 'Amniota', step: 'An egg with its own pond inside — membranes and a shell — so it can be laid on dry land. Now animals could leave the water for good.', paths: [], kids: [
                  { n: 'The mammal line', sci: 'Synapsida', link: 'synapsid', note: 'Proto-mammals, then mammals — and you.' },
                  { trunk: true, n: 'The reptile line', sci: 'Sauropsida', link: 'reptile', note: 'Reptiles, dinosaurs and birds.' },
                ] },
              ] },
            ] },
          ] },
        ] },
      ] },
    ] } },
  { id: 'reptile', icon: '🦎', title: 'The reptile tree',
    intro: 'Pterosaurs were not dinosaurs. Neither were ichthyosaurs, plesiosaurs or mosasaurs. They were all reptiles — but on separate branches. This tree shows which. Crocodiles turn out to be closer to birds than to lizards.',
    debate: 'Where turtles belong was argued for a century; most studies now put them inside the two-holed reptiles. Where the ichthyosaurs and plesiosaurs fit is still uncertain. Whether phytosaurs belong to the crocodile line or just outside it is argued too.',
    root: { n: 'Reptiles', sci: 'Sauropsida', step: 'A tough, waterproof skin with scales, and eggs with a hard or leathery shell.', paths: [RE_ + 'Early reptiles'], kids: [
      { n: 'Early side branches', sci: 'Parareptilia (in part)', note: 'Pareiasaurs, armoured plant-eaters the size of cattle, and Mesosaurus, one of the first reptiles to return to the water.', debate: 'Whether these form one natural group is argued.', paths: [RE_ + 'Pareiasaurs', RE_ + 'Mesosaurs'] },
      { trunk: true, n: 'Two-holed reptiles', sci: 'Diapsida', step: 'Two openings in the skull behind each eye, for bigger jaw muscles.', paths: [RE_ + 'Early diapsids', RE_ + 'Gliding reptiles'], kids: [
        { n: 'Turtles', sci: 'Testudines', note: 'They lost the holes in their skulls again. The shell began as broad ribs — perhaps for digging.', paths: [RE_ + 'Turtles'] },
        { n: 'Reptiles that went back to sea', note: 'Ichthyosaurs, plesiosaurs and pliosaurs, placodonts and nothosaurs — separate returns to the water, none of them dinosaurs.', debate: 'Where on this tree they belong is still uncertain.', paths: [SE_ + 'Early sea reptiles', SE_ + 'Hupehsuchians', SE_ + 'Ichthyosaurs', SE_ + 'Nothosaurs', SE_ + 'Placodonts', SE_ + 'Plesiosaurs', SE_ + 'Pliosaurs'] },
        { n: 'Lizards, snakes and the tuatara', sci: 'Lepidosauria', step: 'Skin shed in pieces or in one go, as snakes do.', paths: [], kids: [
          { n: 'The tuatara line', sci: 'Rhynchocephalia', note: 'Common in the age of dinosaurs. One species survives, in New Zealand.', paths: [RE_ + 'Rhynchocephalians'] },
          { n: 'Lizards and snakes', sci: 'Squamata', note: 'Including the mosasaurs: giant sea lizards related to monitor lizards and snakes, not to dinosaurs.', paths: [RE_ + 'Lizards', RE_ + 'Snakes', SE_ + 'Mosasaurs'] },
        ] },
        { n: 'Choristoderes', sci: 'Choristodera', note: 'Crocodile-shaped river reptiles that survived the asteroid.', debate: 'Their place on the tree is unsettled.', paths: [RE_ + 'Choristoderes'] },
        { trunk: true, n: 'The archosaur line', sci: 'Archosauromorpha', step: 'Legs drawn in under the body, step by step.', paths: [RE_ + 'Long-necked archosaur relatives', RE_ + 'Rhynchosaurs'], kids: [
          { trunk: true, n: 'Ruling reptiles', sci: 'Archosauria and near relatives', step: 'Teeth set in sockets, and an extra opening in front of the eye.', paths: [RE_ + 'Early archosaurs'], kids: [
            { n: 'The crocodile line', sci: 'Pseudosuchia', note: 'In the Triassic these — not dinosaurs — were the big animals on land: armoured plant-eaters, giant hunters, even ostrich-shaped runners. Crocodiles are what is left.', paths: ['Crocodile line', RE_ + 'Phytosaurs'] },
            { trunk: true, n: 'The bird line', sci: 'Avemetatarsalia', step: 'Slim legs held straight under the body, with an ankle that works like a hinge.', paths: [RE_ + 'Bird-line archosaurs'], kids: [
              { n: 'Pterosaurs', sci: 'Pterosauria', step: 'Wings of skin stretched from one hugely long finger. The first animals with backbones to fly.', note: 'Cousins of the dinosaurs — not dinosaurs.', paths: ['Pterosaurs'] },
              { trunk: true, n: 'Dinosaurs (and birds)', sci: 'Dinosauromorpha', link: 'dino', note: 'Dinosaurs and their closest cousins, ending in the birds.' },
            ] },
          ] },
        ] },
      ] },
    ] } },
);
if (typeof module !== 'undefined') module.exports = { TREES };
