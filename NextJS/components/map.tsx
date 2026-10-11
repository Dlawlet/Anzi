"use client"
import React, { useRef, useEffect } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
const MapboxGeocoder = require("mapbox-gl-geocoder");
import "../app/css/MapComponent.css";
import { escapeHtml } from "../utils/validate.js";
import { NextRequest, NextResponse } from "next/server";

export default function MapComponent({ widtho, heighto, py, page}: any) {
  req: NextRequest; res: NextResponse ;
  const mapContainer = useRef(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);

  
  useEffect(() => {
    localStorage.setItem("suggestion", JSON.stringify([]));
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
    if (mapContainer.current !== null) {
    const coordo = window.location;
    const urlParams = new URLSearchParams(coordo.search);
    const coordinates_ = urlParams.get('coordinates');
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-74.5, 40], 
      zoom: 6,
    });
    
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: true
    });
    
    
    
    // Add the event listener before adding the geocoder control to the map
    geocoder.on("results", async (e:any) => {
      displaysuggestion(e, map);
    });

    map.addControl(geocoder);
    document.getElementsByClassName('mapboxgl-ctrl-geocoder')[0].id = "geocoder";

    //flying animation
    if (page == "map") {fly(map);}
    else if (page == "add" && coordinates_ !== null) {
      var array_coord = JSON.parse("[" + coordinates_ + "]");
      map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
          enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true,
    })); map.setCenter(array_coord); map.setZoom(16);
    // Create a new marker
    const marker = new mapboxgl.Marker().setLngLat(array_coord).addTo(map);
    markerRef.current = marker;
  }
    else {
      map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
          enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true,
    })); map.setCenter([11.5167, 3.8667]); map.setZoom(11);
    }

    // the suggestions list writes each item with innerHTML: escape user-supplied names
    geocoder._typeahead.render = function (this: any, item: any) {
      const value: string = this.getItemValue(item.original || item);
      const query: string = this.query || "";
      const at = query ? value.toLowerCase().indexOf(query.toLowerCase()) : -1;
      if (at < 0) return escapeHtml(value);
      const end = at + query.length;
      return escapeHtml(value.slice(0, at)) + "<strong>" + escapeHtml(value.slice(at, end)) + "</strong>" + escapeHtml(value.slice(end));
    };

    const geocoderInput = geocoder._inputEl;
    geocoderInput.addEventListener("input", (e:any) => {
      const searchValue = e.target.value;
      if (searchValue.length > 2){
      performMapboxSearch(searchValue, geocoder, map);}
      else {
        localStorage.setItem("suggestion", JSON.stringify([]));
      }
    });
    
    geocoder.on('result', async (e: any) => {
      const { result } = e; 
      // Use the center coordinates for creating the marker
      const coordinates = result.geometry.coordinates;

      // Remove previous search marker if it exists
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
      }
      if (markerRef.current) {
        markerRef.current.remove();
      }
      // Create a new marker using the search result coordinates
      const searchMarker = new mapboxgl.Marker().setLngLat(coordinates);    
      // Add the search marker to the map
      searchMarker.addTo(map);

      // Update the searchMarkerRef with the new marker
      searchMarkerRef.current = searchMarker;
    });

    map.on("click", async function (e: any) {
      const coordinates = e.lngLat;

      // Remove previous marker if it exists
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
      }

      // Create a new marker
      const marker = new mapboxgl.Marker().setLngLat(coordinates).addTo(map);
      markerRef.current = marker;

      const lngLatString = `${coordinates.lng},${coordinates.lat}`;
      let addfound;
      const name = "Not yet on Anzi";
      const divElement = document.createElement('div');
      const title = document.createElement('h4');
      title.textContent = name;
      const titleWrapper = document.createElement('div');
      titleWrapper.appendChild(title);
      const assignBtn = document.createElement('div');
      const addButton = document.createElement('button');
      addButton.id = 'inner';
      addButton.className = 'btn text-white bg-brown-600 hover:bg-brown-700 w-full h-5 rounded-lg';
      addButton.textContent = 'Add it';
      assignBtn.appendChild(addButton);
      divElement.appendChild(titleWrapper);
      divElement.appendChild(assignBtn);
      assignBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = "/add_address?coordinates=" + lngLatString;
      });
      if (page == "add") {
        window.history.pushState({}, "", "/add_address?coordinates=" + lngLatString);}
      try {
        const response = await fetch(
          "/api/address?coordinates=" + lngLatString,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

        if (response.ok) {
          const data = await response.json();

          addfound = data[0]["name"];
        } else {
          addfound = name;
        }
      } catch (error) {
        console.error(error);
      }
      // Create a new marker using the search result coordinates
      const searchMarker = new mapboxgl.Marker().setLngLat(coordinates);    
      // Add the search marker to the map
      searchMarker.addTo(map);

      // Update the searchMarkerRef with the new marker
      searchMarkerRef.current = searchMarker;

      if (addfound !== "Not yet on Anzi" && addfound !== "Unnamed") {
        // place names are user-supplied: render as text, never as HTML
        const nameElement = document.createElement('div');
        nameElement.textContent = addfound;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setDOMContent(nameElement)
          .addTo(map);
      }
      else {
        if (page !== "add" && 8<coordinates.lng && coordinates.lng<17 && 1<coordinates.lat && coordinates.lat<14 ) {
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setDOMContent(divElement) 
          .addTo(map);}
      }
    });

    return () => {
      map.remove();
    };}
  }, [page]);

  return (
    <section>
      <div className={py.toString()}>
        <div ref={mapContainer} style={{ width: widtho, height: heighto }} />
      </div>
    </section>
  );

  async function performMapboxSearch(query:String, geocoder:any, map:any) {
    try {
      // Perform partial search on the "name" field in MongoDB
      const response = await fetch(`/api/address?search=${encodeURIComponent(query as string)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      if (response.ok) {
        const results = await response.json();   
        localStorage.setItem("suggestion", JSON.stringify(results));
        }
      else {
        console.error("Search request failed with status:", response.status);
      }
    } catch (error) {
      console.error("Search request failed:", error);
    }
  }
}


function fly(map: any) {
  map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: false
    },
    trackUserLocation: true,
    showUserHeading: true,
    showUserLocation: true,
  }));
  // Control implemented as ES6 class
// Control implemented as ES5 prototypical class
// Control implemented as ES6 class





  // let's add a button at eh left of the previous control, that button have to match the same style as the control button

  // add the navigation control



  var nav = new mapboxgl.NavigationControl();
  map.addControl(nav, 'top-right' );

  var scale = new mapboxgl.ScaleControl({
    maxWidth: 80,
    unit: 'metric',
  });
  map.addControl(scale);

  // fly with default options to null island
  //map.flyTo({center: [0, 0], zoom: 9});
  // using flyTo options
  map.flyTo({
      center: [11.5167, 3.8667], 
      zoom: 16,
      speed: 0.4,
      curve: 2,
      easing(t : any) {
          return t;
      }
  });
}
function displaysuggestion(e:any, map:any) {
  let customSuggestions: Array<any> = [];
  // Manually add a custom clickable suggestion to the results list
  let suggestion = JSON.parse(localStorage.getItem("suggestion") || "[]");
  if (suggestion.length > 0) {
    suggestion.forEach((element:any) => {
    const customSuggestion = {
      id: "custom-suggestion",
      text: element.name,
      place_name: element.name,
      center: element.coordinates,
      geometry: {
        type: "Point",
        coordinates: element.coordinates
      }
      
    }
    customSuggestions.push(customSuggestion);
   });
  const features = e.features;
  let i = 0;
  for (i = 0; i < customSuggestions.length; i++) {
    if (i <3){
    features.unshift(customSuggestions[i]);
    e.features = features;
  }}
  }
}
