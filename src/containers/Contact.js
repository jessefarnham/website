import React from 'react'
import "./Contact.css"
import Resume from "./jesse_farnham_resume.pdf"

export default function Home() {
    return (
        <div className="Contact">
            <div className="lander">
                <h4>Contact, Resume, Other Info</h4>
                <ul>
                    <li>Email: jessefarnham1 at gmail dot com</li>
                    <li><a href={Resume}>My resume</a></li>
                    <li><a href="http://www.github.com/jessefarnham">
                        My Github </a></li>
                    <li><a href="http://www.github.com/jessefarnham/website">
                        Source code for this website</a></li>
                    <li><a href="http://www.github.com/jessefarnham/flight-info">
                        Source code for the flight status backend</a></li>
                    <li><a href="http://www.github.com/jessefarnham/marooned">
                        Source code for my attempt at a
                        roguelike video game</a></li>
                    <li><a href="http://arks.princeton.edu/ark:/88435/dsp01k0698762g">
                        My dissertation</a></li>
                    <li><a href="https://wesscholar.wesleyan.edu/etd_hon_theses/97/">
                        My senior thesis</a></li>
                </ul>
            </div>
        </div>
    )
}
