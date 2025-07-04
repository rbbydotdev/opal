export const WorkspaceSeedFiles: Record<string, string | Promise<string>> = {
  // ...Object.fromEntries(new Array(100).fill(0).map((_, x) => [`/file-${x}.md`, ` needle ${x}`.repeat(1000)])),
  "/welcome.md": "# Welcome to your new workspace!",
  "/home/drafts/post1.md": "# Hello World!",
  "/drafts/draft1.md": "# Goodbye World!",
  "/ideas/ideas.md": "# Foobar bizz bazz",
  "/lorems-ipsum.md": `

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque cursus augue enim, eu vulputate dolor lacinia at. Sed viverra sem non ultricies congue. Sed quis purus a purus convallis maximus a vitae ex. Suspendisse aliquet sagittis nulla at faucibus. Maecenas tincidunt quam at placerat scelerisque. Proin sollicitudin interdum arcu eget tempus. Proin mattis laoreet pellentesque. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris interdum ante eu massa blandit, ut auctor mi consequat. Aenean id nunc nec nunc dapibus pretium. Nunc gravida efficitur nulla, sit amet aliquam lacus posuere nec. Nam varius mi a congue pellentesque. Suspendisse mattis consequat interdum. Praesent porttitor sapien id sem fermentum sollicitudin. Proin finibus magna nibh, ut vulputate lorem condimentum sit amet. Aenean convallis mauris felis, sed pharetra augue luctus scelerisque.

Vivamus semper pretium ipsum, sit amet viverra mauris vehicula eget. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Nam ornare odio velit, ac tincidunt elit dignissim tempor. Donec at ante consequat, tristique neque at, ultrices ante. Donec scelerisque, augue vitae porta commodo, orci augue faucibus purus, quis laoreet metus turpis vel tellus. Nam sit amet bibendum massa. Integer ac rutrum ex, et sollicitudin dui. Phasellus semper, magna eget convallis mollis, nunc lacus vestibulum sem, vitae ultrices nisl tortor vitae elit. Vestibulum fringilla sem vel ullamcorper cursus. Duis congue, nibh et efficitur laoreet, ipsum tortor pulvinar libero, sit amet semper erat est quis massa. Donec vel odio eget elit efficitur gravida. Morbi a fringilla est. Fusce in urna sit amet nulla sagittis rutrum. Donec fermentum, est eget interdum fringilla, leo velit ultricies nibh, ut tincidunt odio sem eu mi. Fusce eget dui nec ligula lacinia varius vitae vel augue. Curabitur ut hendrerit dolor.

In mattis arcu id congue mattis. Curabitur ligula magna, fringilla sed fermentum a, porttitor a quam. Cras tempus aliquam ligula quis dictum. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Curabitur finibus hendrerit libero. In eget dolor urna. Praesent ornare suscipit vestibulum. Curabitur nec malesuada ante. Proin tristique est tortor. Fusce sapien lacus, accumsan nec mollis vitae, tincidunt quis turpis.

    
    `,
};
