

Field instance
`field.field.node.news.field_n_featured_image.yml`
```
uuid: b6ae9d14-c8c8-438d-aae3-5a557ef1ebbb  
langcode: en  
status: true  
dependencies:  
  config:  
    - field.storage.node.field_n_featured_image  
    - node.type.news  
  module:  
    - core  
id: node.news.field_n_featured_image  
field_name: field_n_featured_image  
entity_type: node  
bundle: news  
label: 'Featured image'  
description: ''  
required: false  
translatable: true  
default_value: {  }  
default_value_callback: ''  
settings:  
  handler: default  
  handler_settings:  
    target_bundles:  
      civictheme_image: civictheme_image  
      civictheme_remote_video: civictheme_remote_video  
    sort:  
      field: _none  
    auto_create: false  
field_type: entity_reference
```

Field Storage
`field.field.node.news.field_n_featured_image.yml`

```
uuid: 5bfa2125-e128-4f72-bcd1-679a57f7a173  
langcode: en  
status: true  
dependencies:  
  module:  
    - core  
id: node.field_n_featured_image  
field_name: field_n_featured_image  
entity_type: node  
type: entity_reference  
settings:  
  target_type: media  
module: core  
locked: false  
cardinality: 1  
translatable: true  
indexes: {  }  
persist_with_no_fields: false  
custom_storage: false


```


These fields have been imported and exported - but it has a dependency on `core`

**Can you debug where this dependency has come from?**


We get this error importing fields:

```
 There were errors validating the config synchronization.                        
 Configuration <em class="placeholder">field.field.node.news.field_n_feature     
 d_image</em> depends on the <em class="placeholder">core</em> module that w     
 ill not be installed after import.                                              
 Configuration <em class="placeholder">field.storage.node.field_n_featured_i     
 mage</em> depends on the <em class="placeholder">core</em> module that will     
  not be installed after import.

```


Core is not a module.