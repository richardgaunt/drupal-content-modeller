
We currently generate URLs to Admin paths. I want to be able to provide a "Links to Entity Type" menu item in the project menu.

When you select a Links to Entity Type.
You are asked to select an entity type
Then it will show you:
- Edit Form
- Manage Fields
- Manage Form Display
- Manage Display
- Manage permission links

Each of these has patterns based on entity type:


### Node

- Edit Form - `/admin/structure/types/manage/<bundle machine name>`
- Manage Fields - `admin/structure/types/manage/<bundle machine name>/fields`
- Manage Form Display - `admin/structure/types/manage/<bundle machine name>/form-display`
- Manage Display - `admin/structure/types/manage/<bundle machine name>/display`
- Manage permission links  - `admin/structure/types/manage/<bundle machine name>/permissions`


### Paragraph

- Edit Form - `/admin/structure/paragraphs_type/<bundle>`
- Manage Fields - `/admin/structure/paragraphs_type/<bundle>/fields`
- Manage Form Display - `/admin/structure/paragraphs_type/<bundle>/form-display`
- Manage Display - `/admin/structure/paragraphs_type/<bundle>/display`
- Manage permission links - NONE

### Vocabulary

- Edit Form - `/admin/structure/taxonomy/manage/<bundle>`
- Manage Fields - `/admin/structure/taxonomy/manage/<bundle>/overview/fields`
- Manage Form Display - `/admin/structure/taxonomy/manage/<bundle>/overview/form-display`
- Manage Display - `/admin/structure/taxonomy/manage/<bundle>/overview/display`
- Manage permission links - `/admin/structure/taxonomy/manage/<bundle>/overview/permissions`


## Block Content

- Edit Form - `/admin/structure/block-content/manage/<bundle>`
- Manage Fields - `/admin/structure/block-content/manage/<bundle>/fields`
- Manage Form Display -  `/admin/structure/block-content/manage/<bundle>/form-display`
- Manage Display -  `/admin/structure/block-content/manage/<bundle>/display`
- Manage permission links-  `/admin/structure/block-content/manage/<bundle>/permissions`


### Media

- Edit Form - `/admin/structure/media/manage/<bundle>`
- Manage Fields  - `/admin/structure/media/manage/<bundle>/fields`
- Manage Form Display -  `/admin/structure/media/manage/<bundle>/form-display`
- Manage Display -  `/admin/structure/media/manage/<bundle>/display`
- Manage permission links -  `/admin/structure/media/manage/<bundle>/permissions`