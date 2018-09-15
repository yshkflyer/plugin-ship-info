import React, { Component } from 'react'
import propTypes from 'prop-types'
import { Dropdown } from 'react-bootstrap'
import { connect } from 'react-redux'
import { get, each, findIndex } from 'lodash'
import FontAwesome from 'react-fontawesome'
import cls from 'classnames'

import { extensionSelectorFactory } from 'views/utils/selectors'

import { hexToRGBA, captureRect } from '../../utils'
import { onDPInit, onAddShip, onDisplaceShip, onRemoveShip } from '../../redux'
import {
  deckPlannerCurrentSelector,
  shipMenuDataSelector,
  deckPlannerShipMapSelector,
} from '../../selectors'
import Area from './area'
import ShipGrid from './ship-grid'

const { __ } = window.i18n['poi-plugin-ship-info']

const reorderShips = (dispatch, getState) => {
  const state = getState()
  const ships = shipMenuDataSelector(state)
  const planMap = deckPlannerShipMapSelector(state)

  each(ships, ship => {
    if (ship.area > 0) {
      if (!(ship.id in planMap)) {
        dispatch(
          onAddShip({
            shipId: ship.id,
            areaIndex: ship.area - 1,
          }),
        )
      } else if (ship.area - 1 !== planMap[ship.id]) {
        dispatch(
          onDisplaceShip({
            shipId: ship.id,
            fromAreaIndex: planMap[ship.id],
            toAreaIndex: ship.area - 1,
          }),
        )
      }
    }
  })

  each(Object.keys(planMap), shipId => {
    if (findIndex(ships, ship => ship.id === +shipId) < 0) {
      dispatch(
        onRemoveShip({
          shipId: +shipId,
          areaIndex: planMap[shipId],
        }),
      )
    }
  })
}

const DeckPlannerView = connect(state => {
  const displayFleetName = get(
    state.config,
    'plugin.ShipInfo.displayFleetName',
    false,
  )
  const mapname = displayFleetName
    ? get(state, ['fcd', 'shiptag', 'fleetname', window.language], [])
    : get(state, ['fcd', 'shiptag', 'mapname'], [])

  return {
    color: get(state, 'fcd.shiptag.color', []),
    mapname,
    current: deckPlannerCurrentSelector(state),
    vibrant: get(state, 'config.poi.vibrant'),
    displayFleetName,
    zoomLevel: get(state, 'config.poi.zoomLevel', 1),
  }
})(
  class DeckPlannerView extends Component {
    static propTypes = {
      color: propTypes.arrayOf(propTypes.string),
      mapname: propTypes.arrayOf(propTypes.string),
      current: propTypes.arrayOf(propTypes.array),
      vibrant: propTypes.number,
      open: propTypes.bool,
      dispatch: propTypes.func,
      displayFleetName: propTypes.bool.isRequired,
      window: propTypes.instanceOf(window.constructor),
      zoomLevel: propTypes.number.isRequired,
    }

    constructor(props) {
      super(props)

      this.state = {
        name: 'deck plan',
        left: 0,
        view: 'area',
        fill: -1,
        extend: false,
      }
    }

    componentWillMount = () => {
      const { mapname, color, current } = this.props
      if (current.length !== mapname.length) {
        this.props.dispatch(
          onDPInit({
            color,
            mapname,
          }),
        )
      }
    }

    componentWillReceiveProps = nextProps => {
      if (!this.props.open && nextProps.open) {
        const toolbar = nextProps.window.document.querySelector(
          '#settings-toolbar',
        )
        const planner = nextProps.window.document.querySelector('#planner')
        if (toolbar && planner) {
          const { left: outerLeft } = toolbar.getBoundingClientRect()
          const { left: innerLeft } = planner.getBoundingClientRect()
          this.setState({
            left: Math.round(outerLeft - innerLeft),
          })
        }
      }
      const { mapname, color, current } = nextProps
      if (current.length !== mapname.length) {
        this.props.dispatch(
          onDPInit({
            color,
            mapname,
          }),
        )
      }
    }

    handleCaptureImage = async () => {
      await this.setState({ extend: true })
      await captureRect('#planner-rect', this.props.window.document)
      this.setState({ extend: false })
    }

    handleChangeDisplayFleetName = () => {
      config.set(
        'plugin.ShipInfo.displayFleetName',
        !this.props.displayFleetName,
      )
    }

    render() {
      const { left, view, fill, extend } = this.state
      const { mapname, color, displayFleetName, zoomLevel } = this.props

      const areas = mapname.map((name, index) => ({
        name,
        color: color[index],
        ships: [],
        areaIndex: index,
      }))
      const { vibrant } = this.props
      return (
        <ul
          className="dropdown-menu"
          style={{
            width: `calc(95vw / ${zoomLevel})`,
            height: `calc(90vh / ${zoomLevel})`,
            left,
            background: `rgba(51, 51, 51, ${vibrant ? 0.95 : 1})`,
            overflowY: extend && 'visible',
          }}
        >
          <div
            style={{
              display: 'flex',
              position: 'sticky',
              top: '-5px',
              background: `rgba(51, 51, 51, ${vibrant ? 0.95 : 1})`,
              zIndex: 1,
            }}
          >
            <div className="radio-check" style={{ marginRight: '2em' }}>
              <div
                onClick={() => this.setState({ view: 'area' })}
                className={cls('filter-option', {
                  checked: view === 'area',
                  dark: window.isDarkTheme,
                  light: !window.isDarkTheme,
                })}
                role="button"
                tabIndex="0"
              >
                {__('Area View')}
              </div>
              <div
                onClick={() => this.setState({ view: 'ship' })}
                className={cls('filter-option', {
                  checked: view === 'ship',
                  dark: window.isDarkTheme,
                  light: !window.isDarkTheme,
                })}
                role="button"
                tabIndex="0"
              >
                {__('Ship Grid')}
              </div>
            </div>
            {view === 'ship' && (
              <div className="radio-check" style={{ marginRight: '2em' }}>
                <div className="filter-span">
                  <span>{__('Palette')}</span>
                </div>
                <div
                  onClick={() => this.setState({ fill: -1 })}
                  className={cls('filter-option', {
                    checked: fill === -1,
                    dark: window.isDarkTheme,
                    light: !window.isDarkTheme,
                  })}
                  role="button"
                  tabIndex="0"
                >
                  {__('None')}
                </div>
                {areas.map(area => (
                  <div
                    key={area.color}
                    onClick={() => this.setState({ fill: area.areaIndex })}
                    className={cls('filter-option', {
                      checked: fill === area.areaIndex,
                      dark: window.isDarkTheme,
                      light: !window.isDarkTheme,
                    })}
                    style={{
                      color: fill !== area.areaIndex && area.color,
                      backgroundColor:
                        fill === area.areaIndex && hexToRGBA(area.color, 0.75),
                    }}
                    role="button"
                    tabIndex="0"
                  >
                    {area.name}
                  </div>
                ))}
              </div>
            )}
            <div className="radio-check">
              <div
                onClick={this.handleChangeDisplayFleetName}
                className={cls('filter-option', {
                  dark: window.isDarkTheme,
                  light: !window.isDarkTheme,
                  checked: displayFleetName,
                })}
                role="button"
                tabIndex="0"
              >
                {__('Show fleet name')}
              </div>
              <div
                onClick={() => this.props.dispatch(reorderShips)}
                className={cls('filter-option', {
                  dark: window.isDarkTheme,
                  light: !window.isDarkTheme,
                })}
                role="button"
                tabIndex="0"
              >
                {__('Refresh')}
              </div>
              <div
                onClick={this.handleCaptureImage}
                className={cls('filter-option', {
                  dark: window.isDarkTheme,
                  light: !window.isDarkTheme,
                })}
                role="button"
                tabIndex="0"
              >
                {__('Save to image')}
              </div>
            </div>
          </div>
          <div id="planner-rect">
            {view === 'area' && (
              <div>
                {areas.map(area => (
                  <Area
                    key={area.color}
                    area={area}
                    index={area.areaIndex}
                    others={areas.filter(
                      ({ areaIndex }) => areaIndex !== area.areaIndex,
                    )}
                  />
                ))}
              </div>
            )}
            {view === 'ship' && <ShipGrid fill={fill} />}
          </div>
        </ul>
      )
    }
  },
)

const handleToggleAction = () => ({
  type: '@@poi-plugin-ship-info@active-dropdown',
  activeDropdown: 'planner',
})

const PlannerDropdown = connect(
  (state, props) => ({
    activeDropdown: get(
      extensionSelectorFactory('poi-plugin-ship-info')(state),
      'ui.activeDropdown',
      0,
    ),
    window: props.window,
  }),
  { handleToggle: handleToggleAction },
)(({ activeDropdown, handleToggle, window }) => (
  <Dropdown
    id="planner"
    pullRight
    open={activeDropdown === 'planner'}
    onToggle={handleToggle}
  >
    <Dropdown.Toggle>
      <FontAwesome name="tags" style={{ marginRight: '1ex' }} />
      {__('Deck Planner')} <sup>BETA</sup>
    </Dropdown.Toggle>
    <DeckPlannerView
      bsRole="menu"
      open={activeDropdown === 'planner'}
      window={window}
    />
  </Dropdown>
))

export default PlannerDropdown
