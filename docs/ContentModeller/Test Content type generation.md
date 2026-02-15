
**Note**
Use the `dcm` command to generate the editorial content below. Read @COMMANDS.md for the commands available and how to use the application.

Generate project report after completing the content type.

Below are the ACs for generating a content type, read the below and create the necessary fields, form display, and edit existing roles to add the configured permissions below.

You will need to create the form display using DCM command after creating the disply

Recommend using `--sync` after a batch of work ie adding all permissions to all roles, adding fields to entity etc. You decide how to do that.


**AC 1 - Content type exists**  
GIVEN I’m a Content Author  
WHEN I go to Admin > Content  
THEN there is a content type called `News`

**AC 2 - Workflow**  
GIVEN I’m a Content Author  
WHEN I create a new content of the type `News`  
THEN the CivicTheme editorial workflow is enabled

**AC 3 - Permissions**  
GIVEN I’m an Administrator  
WHEN I review permissions for content of the type `News`  
THEN the CivicTheme OOTB default permissions are applied

|                         |                   |                        |                      |                    |
| ----------------------- | ----------------- | ---------------------- | -------------------- | ------------------ |
| **Permission**          | **Administrator** | **Site Administrator** | **Content Approver** | **Content Author** |
| **Create new content**  | Yes               | Yes                    | No                   | Yes                |
| **Delete any content**  | Yes               | Yes                    | No                   | Yes                |
| **Delete own content**  | Yes               | Yes                    | No                   | Yes                |
| **Edit any content**    | Yes               | Yes                    | No                   | Yes                |
| **Edit own content**    | Yes               | Yes                    | No                   | Yes                |
| **Publish any content** | Yes               | Yes                    | Yes                  | Yes                |
| **Publish own content** | Yes               | Yes                    | N/A                  | Yes                |

**AC 4 - Available fields**  
GIVEN I’m a Content Author  
WHEN I create a new content of the type `News`  
THEN the following fields are available  
AND they are in the following order

|                        |                             |              |                 |                                     |                                                          |
| ---------------------- | --------------------------- | ------------ | --------------- | ----------------------------------- | -------------------------------------------------------- |
| **Field name / label** | **Type**                    | **Required** | **Cardinality** | **Help text**                       | **Description/Notes**                                    |
| Title                  | Text                        | Yes          | 1               | N/A                                 |                                                          |
| Classification         | Text plain                  | No           | 1               | N/A                                 |                                                          |
| Employment status      | Text plain                  | No           | 1               | `Ongoing, non-ongoing etc…`         |                                                          |
| Employment type        | Text plain                  | No           | 1               | `Full time, part time, casual etc…` |                                                          |
| Description            | Body                        | No           | 1               | N/A                                 |                                                          |
| Salary range           | Text plain                  | No           | 1               | N/A                                 |                                                          |
| Division               | Select (Taxonomy reference) | No           | 1               | N/A                                 | References `Division` vocab                              |
| Location               | Text plain                  | No           | 1               | N/A                                 |                                                          |
| Security level         | Text plain                  | No           | 1               | N/A                                 | Placeholder default value in the text field - `Baseline` |
| Contact officer        | Text plain                  | No           | 1               | N/A                                 |                                                          |
| Closing date           | Date and time               | No           | 1               | N/A                                 |                                                          |
| Job title              | Text plain                  | No           | 1               | N/A                                 |                                                          |
| Position number        | Text plain                  | No           | 1               | N/A                                 |                                                          |
| Attachment             | Paragraph                   | No           | Unlimited       | N/A                                 | CivicTheme Attachment component                          |


**AC 5 - Create Form Display using default generated form display**

The first field in the form display is title, followed by the fields noted above.
