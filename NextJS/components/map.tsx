"use client"
import React, { useRef, useEffect } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl";
const MapboxGeocoder = require("mapbox-gl-geocoder");
//const MapboxDirections = require('@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions');
import "../app/css/MapComponent.css";
import "../app/css/mapbox-gl-directions.css";
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
    
    
    
    const MapboxDirections = require('@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions');
    var directions = new MapboxDirections({
    })
    class HelloWorldControl {
      private _map: any;
      private _container: HTMLDivElement | undefined;
      onAdd(map: any) {
          this._map = map;
          //let's create the button with same style as other control button, that will launch the directions widget
          this._container = document.createElement('div');
          this._container.className = 'mapboxgl-ctrl-group mapboxgl-ctrl';
          this._container.innerHTML = '<button class="mapboxgl-ctrl-icon" type="button"><svg fill="#000000"  version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-95.63 -95.63 607.04 607.04" xml:space="preserve" stroke="#000000" stroke-width="12.889273"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path id="XMLID_2112_" d="M166.291,173.031h-20c-4.971,0-9-4.029-9-9s4.029-9,9-9h20c4.971,0,9,4.029,9,9 S171.262,173.031,166.291,173.031z M130.65,219.54h-20c-4.971,0-9,4.029-9,9s4.029,9,9,9h20c4.971,0,9-4.029,9-9 S135.62,219.54,130.65,219.54z M111.291,173.031c4.971,0,9-4.029,9-9s-4.029-9-9-9h-4.667c-6.551,0-13.084,1.592-18.893,4.604 c-4.413,2.288-6.136,7.719-3.848,12.132c1.601,3.089,4.743,4.86,7.998,4.86c1.395,0,2.811-0.325,4.135-1.012 c3.307-1.714,6.877-2.583,10.61-2.584H111.291z M83.369,196.286l0.001-0.239c0.045-4.97-3.947-9.036-8.917-9.082 c-4.928-0.048-9.036,3.947-9.082,8.917l-0.002,0.403c0,8.496,2.587,16.668,7.482,23.636c1.752,2.494,4.54,3.828,7.372,3.828 c1.787,0,3.592-0.531,5.166-1.637c4.067-2.857,5.048-8.471,2.19-12.538C84.826,205.654,83.369,201.059,83.369,196.286z M221.984,172.906c4.955-0.384,8.661-4.713,8.276-9.669c-0.383-4.956-4.697-8.654-9.669-8.277c-0.604,0.047-1.218,0.071-1.821,0.071 h-17.479c-4.971,0-9,4.029-9,9s4.029,9,9,9h17.479C219.836,173.031,220.917,172.989,221.984,172.906z M207.558,108.52h11.21 c2.121,0,4.221,0.289,6.241,0.857c0.815,0.229,1.635,0.338,2.441,0.338c3.931,0,7.543-2.596,8.659-6.566 c1.346-4.785-1.442-9.754-6.228-11.1c-3.605-1.014-7.344-1.528-11.112-1.529h-11.212c-4.971,0-9,4.029-9,9 S202.587,108.52,207.558,108.52z M152.558,108.52h20c4.971,0,9-4.029,9-9s-4.029-9-9-9h-20c-4.971,0-9,4.029-9,9 S147.587,108.52,152.558,108.52z M240.65,219.54h-20c-4.971,0-9,4.029-9,9s4.029,9,9,9h20c4.971,0,9-4.029,9-9 S245.62,219.54,240.65,219.54z M260.025,131.775c0-2.937-0.314-5.872-0.934-8.723c-1.057-4.857-5.853-7.943-10.706-6.883 c-4.857,1.055-7.939,5.849-6.884,10.706c0.348,1.597,0.523,3.246,0.523,4.897c-0.001,3.186-0.642,6.275-1.904,9.182 c-1.98,4.559,0.109,9.86,4.668,11.841c1.169,0.508,2.385,0.748,3.582,0.748c3.476,0,6.786-2.025,8.26-5.416 C258.881,142.946,260.024,137.445,260.025,131.775z M185.65,219.54h-20c-4.971,0-9,4.029-9,9s4.029,9,9,9h20c4.971,0,9-4.029,9-9 S190.62,219.54,185.65,219.54z M82.086,133.64c-18.813,0-34.12-15.306-34.12-34.119s15.306-34.119,34.12-34.119 c18.813,0,34.119,15.306,34.119,34.119S100.899,133.64,82.086,133.64z M82.086,115.64c8.888,0,16.119-7.231,16.119-16.119 s-7.231-16.119-16.119-16.119c-8.888,0-16.12,7.231-16.12,16.119S73.198,115.64,82.086,115.64z M403.138,385.204 c-4.933,18.406-21.649,30.578-39.866,30.579c-3.522,0-7.099-0.455-10.66-1.408l-83.404-22.32c-3.937-1.053-6.674-4.619-6.674-8.694 v-33.149c0-2.81,1.313-5.458,3.547-7.16c2.234-1.702,5.135-2.264,7.846-1.516l88.51,24.414c4.791,1.321,7.604,6.277,6.282,11.069 c-1.321,4.791-6.277,7.605-11.068,6.283l-77.116-21.271v14.423l76.731,20.534c12.396,3.316,25.169-4.061,28.486-16.442 c0.612-2.287,0.86-4.587,0.78-6.839c-0.021-0.232-0.033-0.467-0.036-0.705c-0.644-9.66-7.33-18.295-17.189-20.938l-92.826-24.883 c-1.847-0.494-7.093-1.98-12.432,0l-116.27,31.155c-0.761,0.222-3.141,0.552-5.042,0.004L17.921,325.138 c-3.942-1.049-6.687-4.618-6.687-8.698V9.001c0-2.798,1.301-5.437,3.521-7.14c2.219-1.703,5.105-2.279,7.808-1.553l122.686,32.869 L259.391,2.592c7.008-1.878,14.73-1.878,21.746,0l92.718,24.844c17.345,4.647,29.61,19.85,30.52,37.829 c0.008,0.15,0.012,0.301,0.012,0.452l0.108,306.725C404.71,376.637,404.283,380.933,403.138,385.204z M386.483,340.406 l-0.097-274.438c-0.592-9.908-7.634-18.585-17.189-21.146l-89.932-24.098v46.942c0,4.971-4.029,9-9,9s-9-4.029-9-9V20.725 L154.25,49.399v7.571c0,4.971-4.029,9-9,9s-9-4.029-9-9V49.4L29.234,20.729v288.792l107.016,28.468v-65.59c0-4.971,4.029-9,9-9 s9,4.029,9,9v65.568l105.141-28.173c0.619-0.166,1.244-0.317,1.874-0.454v-6.373c0-4.971,4.029-9,9-9s9,4.029,9,9v6.373 c0.628,0.136,1.252,0.287,1.87,0.453l92.831,24.883C378.557,335.907,382.76,337.871,386.483,340.406z M361.478,220.983l-6.25,6.25 l6.25,6.25c5.056,5.056,7.84,11.795,7.84,18.977s-2.784,13.921-7.841,18.977c-5.054,5.055-11.794,7.84-18.976,7.84 c-7.182,0-13.922-2.784-18.978-7.84l-6.249-6.25l-6.251,6.25c-5.055,5.055-11.795,7.839-18.977,7.839s-13.922-2.784-18.977-7.84 c-5.056-5.055-7.84-11.794-7.841-18.976c0-7.182,2.784-13.921,7.84-18.977c0,0,0,0,0.001,0l6.249-6.249l-6.25-6.25 c-5.056-5.056-7.84-11.796-7.84-18.978c0-7.182,2.785-13.921,7.841-18.977c5.055-5.056,11.794-7.84,18.977-7.84 c7.182,0,13.922,2.784,18.978,7.84l6.25,6.25l6.249-6.25c5.056-5.056,11.795-7.84,18.977-7.84c7.183,0,13.922,2.785,18.977,7.841 c5.056,5.054,7.841,11.794,7.841,18.976C369.319,209.187,366.534,215.927,361.478,220.983z M336.136,220.869l12.613-12.614 c1.657-1.656,2.568-3.876,2.568-6.25s-0.911-4.592-2.567-6.248c-1.657-1.657-3.876-2.569-6.25-2.569 c-2.373,0-4.593,0.912-6.248,2.567l-12.613,12.614c-1.688,1.688-3.978,2.636-6.364,2.636s-4.676-0.948-6.364-2.636l-12.614-12.614 c-1.655-1.656-3.875-2.568-6.249-2.568s-4.593,0.912-6.248,2.567c-1.657,1.657-2.569,3.876-2.569,6.25s0.912,4.593,2.568,6.25 l12.614,12.613c1.688,1.688,2.636,3.978,2.636,6.364c0,2.387-0.948,4.676-2.637,6.364l-12.613,12.613 c-1.656,1.656-2.568,3.875-2.568,6.25c0,2.373,0.912,4.592,2.567,6.247c1.657,1.658,3.877,2.57,6.25,2.57 c2.374,0,4.594-0.912,6.249-2.567l12.615-12.614c1.757-1.757,4.061-2.636,6.363-2.636c2.304,0,4.606,0.878,6.364,2.636 l12.613,12.613c1.655,1.656,3.875,2.567,6.248,2.567c2.374,0,4.593-0.912,6.248-2.567c1.657-1.657,2.569-3.876,2.569-6.25 s-0.911-4.592-2.567-6.249l-12.614-12.614C332.621,230.082,332.621,224.384,336.136,220.869z"></path> </g></svg></button>';
          this._container.onclick = function() {  
            // if widget already exist, remove it, otherwise create it
            if (typeof window !== "undefined"){
              const MapboxDirections = require('@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions');
              if ( document.getElementsByClassName('mapboxgl-ctrl-directions') !== null && document.getElementsByClassName('mapboxgl-ctrl-directions').length > 0) {
                console.log("allready exist");
                //map.addControl(geocoder, 'top-left');
                console.log(document.getElementsByClassName('mapboxgl-ctrl-directions')[0]);
                document.getElementById('geocoder')!.style.visibility = 'visible';
                console.log(document.getElementsByClassName('mapboxgl-ctrl-directions')[0]);
                map.removeControl(directions);
                //console.log(document.getElementsByClassName('mapboxgl-ctrl-directions')[0].remove());
              }
              else {
                console.log("create");
                console.log(document.getElementsByClassName('mapboxgl-ctrl-directions')[0]);
                document.getElementById('geocoder')!.style.visibility = 'hidden';
                console.log(document.getElementsByClassName('mapboxgl-ctrl-directions')[0]);
                // Create a new directions control instance with id = 'directions'
                //map.removeControl(geocoder);
                directions= new MapboxDirections({
                  accessToken: mapboxgl.accessToken,
                  unit: 'metric',
                  profile: 'mapbox/driving',
                  interactive: true,
                  controls: {
                    inputs: true,
                    instructions: true,
                    profileSwitcher: true
                  },
                });
                // Add the directions control to the map
                map.addControl(directions, 'top-left');


              }

            } 
          };
          return this._container;

      }

    
      onRemove() {
        if (this._container === undefined || this._container === null) {return;}
        else{
          this._container.parentNode?.removeChild(this._container);
          this._map = undefined;
        }
      }
    }
    //use the class
    if (page == "map") {map.addControl(new HelloWorldControl(), 'top-left');}
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
      const innerHtmlContent = `<div><h4>${name} </h4> </div>`;
      const divElement = document.createElement('div');
      const assignBtn = document.createElement('div');
      assignBtn.innerHTML = `<button id = 'inner' class="btn text-white bg-brown-600 hover:bg-brown-700 w-full h-5 rounded-lg">Add it</button>`;
      divElement.innerHTML = innerHtmlContent;
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
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(addfound) 
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
      const response = await fetch(`/api/address?search=${query}`, {
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
