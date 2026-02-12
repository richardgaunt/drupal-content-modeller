
At the moment it is:

```
export const ENTITY_PREFIXES = {  
  node: 'field_c_n_',  
  media: 'field_c_m_',  
  paragraph: 'field_c_p_',  
  taxonomy_term: 'field_c_t_',  
  block_content: 'field_c_b_'  
};

```

Change to

```
export const ENTITY_PREFIXES = {  
  node: 'field_n_',  
  media: 'field_m_',  
  paragraph: 'field_p_',  
  taxonomy_term: 'field_t_',  
  block_content: 'field_b_'  
};
```