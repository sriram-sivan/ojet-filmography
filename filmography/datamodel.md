# Fusion data model for the filmography

## Custom Objects & Fields

| *Name*         | *Display name*   | *API Name*       | *Field*    | *Type*    | *API name* | *Notes* |
| -              |                  | -                | -          | -         | -          | -       |
| WxActor        | Actor            | WxActor_c        | Actor#     | Text      | RecordName | Auto-generated with A-{00000000} |
|                |                  |                  | Name       | Text      | Name_c     | |
| WxFilm         | Film             | WxFilm_c         | Film#      | Text      | RecordName | Auto-generated with F-{00000000} |
|                |                  |                  | Title      | Text      | Title_c    | |
|                |                  |                  | Genre      | FCL       | Genre_c    | Standard Lookup lookup code WX_FILM_GENRE |
| WxActorFileMap | ActorFilmMap     | WxActorFileMap_c | ActorFilm# | Text      | RecordName | Auto-generated with AF-{00000000} |
|                |                  |                  | DCL        | WxActor_c | Actor_Id_c | |
|                |                  |                  | DCL        | WxFilm_c  | Film_Id_c  | |
