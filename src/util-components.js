import React from 'react'
import './util-components.css'

/**
 * Semi-transparent overlay to use underneath modal dialogs. Parent object must have `position: relative`.
 * @param {Object} props
 * @param {() => void} props.onClose
 */
export function ModalOverlay(props) {
  return <div className='modal-overlay'>
    <div className='content'>
      { props.children }
    </div>
    <div className='click-bait' onClick={ props.onClose }/>
  </div>
}

/**
 * A material design-style button.
 * @param {Object} props
 * @param {string} props.type Either 'flat' or 'inverse' (for white-on-dark button)
 * @param {() => void} props.onClick
 */
export function Button(props) {
  return <button 
    className={ props.type } 
    onClick={ props.onClick }>{ 
      props.children 
    }</button>
}

/**
 * A material design-style card.
 * @param {Object} props
 * @param {string} props.title Title at the top of the card.
 * @param {string[]} props.actions An optional array of actions. They values are strings 
 *                                 that must correspond to images in the img directory.
 * @param {(string) => void} props.onAction
 */
export function Card(props) {
  return <div className={'card ' + props.className}>
    <div className='title'>
      <div className='name'>
        { props.title }
      </div>

      {
        (props.actions || []).map(action => 
          <div className='action' key={ action } onClick={ () => props.onAction(action) }>
            <img src={ 'img/' + action + '.svg' } alt={ action }/>
          </div>
        )
      }
    </div>
    <div className='body'>
      { props.children }
    </div>
  </div>
}

/**
 * A material design-style text input field.
 * @param {Object} props
 * @param {string} props.placeholder 
 * @param {string} props.value
 * @param {() => void} props.onChange
 */
export function TextInput(props) {
  return <div className="text-input">
    <input type="text" required value={ props.value } onChange={ props.onChange } />
    <span className="highlight"></span>
    <span className="bar"></span>
    <label>{ props.placeholder }</label>
  </div>
}