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
if (typeof module !== 'undefined') module.exports = { TREES };
