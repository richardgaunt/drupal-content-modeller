
Each bundle and entity type allows the setting of permissions to do CRUD actions.

Projects should sync role configuration files and allow editing of role configuration.

We should also allow the creation of roles for a project

Look at the role configuration here:

```
config/user.role.civictheme_content_approver.yml
config/user.role.civictheme_content_author.yml
config/user.role.civictheme_site_administrator.yml

```

To create  a role we should ask the following questions:

Name of role?
Machine name of role? (provide a default machine name - no prefix just snake cased role name)
Is admin?


Then allow for adding / removing content permissions as below.

We should also be able to edit a role (but not change the role machine name) and add remove content permissions below.

The way we are going to handle permissions is:

"Create a role"
"Edit a role"
After selecting Edit or creating a role then we do the permissions:
"Select an entity type"
"Edit permissions for all bundles of entity type"
"Select a bundle"

Then provide a multi-select checklist (with the roles current permissions selected) as multi-select radio buttons that can be selected for all the permissions of that bundle or of that entity type (for entity type  in the background it will add it to every bundle of that entity type).

## Node

`$type_id` is the bundle name - php for node bundle permissions
```php
return [  
  "create $type_id content" => [  
    'title' => $this->t('%type_name: Create new content', $type_params),  
  ],  
  "edit own $type_id content" => [  
    'title' => $this->t('%type_name: Edit own content', $type_params),  
    'description' => $this->t('Note that anonymous users with this permission are able to edit any content created by any anonymous user.'),  
  ],  
  "edit any $type_id content" => [  
    'title' => $this->t('%type_name: Edit any content', $type_params),  
  ],  
  "delete own $type_id content" => [  
    'title' => $this->t('%type_name: Delete own content', $type_params),  
    'description' => $this->t('Note that anonymous users with this permission are able to delete any content created by any anonymous user.'),  
  ],  
  "delete any $type_id content" => [  
    'title' => $this->t('%type_name: Delete any content', $type_params),  
  ],  
  "view $type_id revisions" => [  
    'title' => $this->t('%type_name: View revisions', $type_params),  
    'description' => $this->t('To view a revision, you also need permission to view the content item.'),  
  ],  
  "revert $type_id revisions" => [  
    'title' => $this->t('%type_name: Revert revisions', $type_params),  
    'description' => $this->t('To revert a revision, you also need permission to edit the content item.'),  
  ],  
  "delete $type_id revisions" => [  
    'title' => $this->t('%type_name: Delete revisions', $type_params),  
    'description' => $this->t('To delete a revision, you also need permission to delete the content item.'),  
  ],  
];


```


## Media

Media type permissions

```php
return [  
  "create $type_id media" => [  
    'title' => $this->t('%type_name: Create new media', $type_params),  
  ],  
  "edit own $type_id media" => [  
    'title' => $this->t('%type_name: Edit own media', $type_params),  
  ],  
  "edit any $type_id media" => [  
    'title' => $this->t('%type_name: Edit any media', $type_params),  
  ],  
  "delete own $type_id media" => [  
    'title' => $this->t('%type_name: Delete own media', $type_params),  
  ],  
  "delete any $type_id media" => [  
    'title' => $this->t('%type_name: Delete any media', $type_params),  
  ],  
  "view any $type_id media revisions" => [  
    'title' => $this->t('%type_name: View any media revision pages', $type_params),  
  ],  
  "revert any $type_id media revisions" => [  
    'title' => $this->t('Revert %type_name: Revert media revisions', $type_params),  
  ],  
  "delete any $type_id media revisions" => [  
    'title' => $this->t('Delete %type_name: Delete media revisions', $type_params),  
  ],  
];
```

## Taxonomy Permissions
```php
return [  
  "create terms in $id" => ['title' => $this->t('%vocabulary: Create terms', $args)],  
  "delete terms in $id" => ['title' => $this->t('%vocabulary: Delete terms', $args)],  
  "edit terms in $id" => ['title' => $this->t('%vocabulary: Edit terms', $args)],  
  "view term revisions in $id" => ['title' => $this->t('%vocabulary: View term revisions', $args)],  
  "revert term revisions in $id" => [  
    'title' => $this->t('%vocabulary: Revert term revisions', $args),  
    'description' => $this->t('To revert a revision you also need permission to edit the taxonomy term.'),  
  ],  
  "delete term revisions in $id" => [  
    'title' => $this->t('%vocabulary: Delete term revisions', $args),  
    'description' => $this->t('To delete a revision you also need permission to delete the taxonomy term.'),  
  ],  
];

```


## Paragraphs

Do not have specific permissions they are connected with node or entity they are connected to.

## Block Content


```php
return [  
  "create $type_id block content" => [  
    'title' => $this->t('%type_name: Create new content block', $type_params),  
  ],  
  "edit any $type_id block content" => [  
    'title' => $this->t('%type_name: Edit content block', $type_params),  
  ],  
  "delete any $type_id block content" => [  
    'title' => $this->t('%type_name: Delete content block', $type_params),  
  ],  
  "view any $type_id block content history" => [  
    'title' => $this->t('%type_name: View content block history pages', $type_params),  
  ],  
  "revert any $type_id block content revisions" => [  
    'title' => $this->t('%type_name: Revert content block revisions', $type_params),  
  ],  
  "delete any $type_id block content revisions" => [  
    'title' => $this->t('%type_name: Delete content block revisions', $type_params),  
  ],  
];

```

