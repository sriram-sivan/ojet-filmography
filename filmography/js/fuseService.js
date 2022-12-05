'use strict';

define(['fuseConfig'], (config) => {

    const baseUrl = `https://${config.fuseHost}`;

    const defaultHeaders = {
        'Authorization': `Basic ${btoa(config.apiUser + ":" + config.apiPass)}`,
        'Accept': 'application/json; charset=UTF-8'
    }
    
    let createEditHeaders = defaultHeaders;
    createEditHeaders['Content-Type'] = 'application/json';

    const isEmpty = (str) => {
        return (!str || 0 === str.length || str === undefined);
    };

    const executeGetRequest = async (endpoint) => {
        console.log("000 executeGetRequest", endpoint);
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: defaultHeaders
        });
        const resp = await response.json();
        return resp;
    }

    const getGenres = async () => {
        const uri = `${baseUrl}/crmRestApi/resources/latest/fndStaticLookups?finder=LookupTypeActiveEnabledOrBindCodeFinder%3BBindLookupType%3DWX_FILM_GENRE&onlyData=true&fields=DisplaySequence,LookupCode,CreationDate`;
        return executeGetRequest(uri);
    }

    const getActors = async () => {
        return executeGetRequest(`${baseUrl}/crmRestApi/resources/latest/WxActor_c`);
    }

    const getActorFilmMap = async (queryWhere = null) => {
        const qParam = isEmpty(queryWhere) ? '' : `?q=${encodeURIComponent(queryWhere)}`;
//        const qParam = isEmpty(queryWhere) ? '' : `?q=${queryWhere}`;
        const uri = `${baseUrl}/crmRestApi/resources/latest/WxActorFilmMap_c${qParam}`;
        const resp = await executeGetRequest(uri);
        return resp;
    }

    const getFilms = async (titleParam = null, limitNum = null, startIndex = null) => {
        const queryWhere = isEmpty(titleParam) ? null : `Title_c LIKE '%${titleParam}%'`;
        const qParam = isEmpty(queryWhere) ? '' : `&q=${encodeURIComponent(queryWhere)}`;
        document.getElementById("searchParam").innerHTML = `&q=${queryWhere}`;

        const limitParam = isEmpty(limitNum) ? '' : `&limit=${parseInt(limitNum)}&offset=${startIndex}`;
        document.getElementById("searchParam").innerHTML += `${limitParam}`;

        const uri = `${baseUrl}/crmRestApi/resources/latest/WxFilm_c?fields=Id,Title_c,Genre_c&onlyData=true${qParam}${limitParam}`;

        const resp = await executeGetRequest(uri);
        return resp;
    }

    const createActor = async (name) => {
        const uri = `${baseUrl}/crmRestApi/resources/latest/WxActor_c`;
        const payload = {
            Name_c: name.toString()
        };
        const response = await fetch(uri, {
            method: 'POST',
            headers: createEditHeaders,
            body: JSON.stringify(payload)
        });
        const resp = await response.json();
        return resp;
    }

    const createFilm = async (title, genre) => {
        const uri = `${baseUrl}/crmRestApi/resources/latest/WxFilm_c`;
        const payload = {
            Title_c: title.toString(),
            Genre_c: genre.toString()
        };
        const response = await fetch(uri, {
            method: 'POST',
            headers: createEditHeaders,
            body: JSON.stringify(payload)
        });
        const resp = await response.json();
        return resp;
    }

    const editFilm = async (id, title, genre) => {
        const uri = `${baseUrl}/crmRestApi/resources/latest/WxFilm_c/${id}`;
        const payload = {
            Id: parseInt(id),
            Title_c: title.toString(),
            Genre_c: genre.toString()
        };
        const response = await fetch(uri, {
            method: 'PATCH',
            headers: createEditHeaders,
            body: JSON.stringify(payload)
        });

        // offline edit handling
        if (!response.ok && response.status === 503 && response.statusText === "Edit will be processed when online") {
            return {
                Id: parseInt(id)
            };
        }

        // this will not work when offline
        const resp = await response.json();

        return resp;
    }

    const createActorFilmMap = async (actorId, filmId, filmTitle, actorName) => {
        const uri = `${baseUrl}/crmRestApi/resources/latest/WxActorFilmMap_c`;
        const payload = {
            Actor_Id_Id_c: parseInt(actorId),
            Film_id_Id_c: parseInt(filmId)
        };
        const response = await fetch(uri, {
            method: 'POST',
            headers: createEditHeaders,
            body: JSON.stringify(payload)
        });
        const resp = await response.json();
        return resp;
    }

    return {
        getGenres: getGenres,
        getActors: getActors,
        getFilms: getFilms,
        getActorFilmMap: getActorFilmMap,
        createActor: createActor,
        createFilm: createFilm,
        editFilm: editFilm,
        createActorFilmMap: createActorFilmMap
    };

});