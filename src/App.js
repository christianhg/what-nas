import hash from 'object-hash'
import * as R from 'ramda'
import React, { Component } from 'react'
import 'modern-normalize'
import './App.css'

export const drives = [
  {
    name: 'WD Red 1TB',
    price: 686,
    storage: 1,
  },
  {
    name: 'WD Red 3TB',
    price: 1047,
    storage: 3,
  },
  {
    name: 'WD Red 4TB',
    price: 1234,
    storage: 4,
  },
  {
    name: 'WD Red 6TB',
    price: 1949,
    storage: 6,
  },
  {
    name: 'WD Red 8TB',
    price: 2599,
    storage: 8,
  },
  {
    name: 'WD Red 10TB',
    price: 3390,
    storage: 10,
  },
]

const units = [
  {
    bays: 2,
    name: 'DS218j',
    price: 1990,
  },
  {
    bays: 2,
    name: 'DS218',
    price: 2932,
  },
  {
    bays: 2,
    name: 'DS218+',
    price: 3789,
  },
  {
    bays: 4,
    name: 'DS418',
    price: 4505,
  },
  {
    bays: 2,
    name: 'DS718+',
    price: 4990,
  },
  {
    bays: 4,
    name: 'DS418play',
    price: 6132,
  },
  {
    bays: 4,
    name: 'DS918+',
    price: 6190,
  },
  {
    bays: 5,
    name: 'DS1517+',
    price: 11105,
  },
]

const raidConfigs = [
  // {
  //   name: 'RAID1',
  //   noOfDrives: 2,
  //   redundancy: 1,
  // },
  // {
  //   name: 'RAID5',
  //   noOfDrives: 3,
  //   redundancy: 1,
  // },
  // {
  //   name: 'RAID5',
  //   noOfDrives: 4,
  //   redundancy: 1,
  // },
  // {
  //   name: 'RAID6',
  //   noOfDrives: 4,
  //   redundancy: 2,
  // },
  {
    name: 'SHR',
    noOfDrives: 2,
    redundancy: 1,
  },
  {
    name: 'SHR',
    noOfDrives: 3,
    redundancy: 1,
  },
  {
    name: 'SHR',
    noOfDrives: 4,
    redundancy: 1,
  },
  {
    name: 'SHR',
    noOfDrives: 5,
    redundancy: 1,
  },
]

const createDrives = amount => drive =>
  Array.from(Array(amount)).map(_ => drive)

export const createConfig = (drives, raidConfigs) => unit =>
  raidConfigs
    .filter(raidConfig => unit.bays >= raidConfig.noOfDrives)
    .map(raidConfig =>
      drives.map(drive => ({
        unit,
        drives: createDrives(raidConfig.noOfDrives)(drive),
        raidConfig,
      })),
    )

const createConfigs = (units, drives, raidConfigs) =>
  R.flatten(units.map(createConfig(drives, raidConfigs)))

const getPrice = R.converge(R.add, [
  R.compose(
    R.sum,
    R.map(R.prop('price')),
    R.prop('drives'),
  ),
  R.compose(
    R.prop('price'),
    R.prop('unit'),
  ),
])

const getStorage = R.compose(
  R.sum,
  R.map(R.prop('storage')),
  R.converge(R.take, [
    R.converge(R.subtract, [
      R.compose(
        R.prop('length'),
        R.prop('drives'),
      ),
      R.compose(
        R.prop('redundancy'),
        R.prop('raidConfig'),
      ),
    ]),
    R.prop('drives'),
  ]),
)

const getPricePerTB = R.converge(R.divide, [getPrice, getStorage])

function createOption(config) {
  return {
    id: hash(config),
    unit: R.prop('unit')(config),
    drives: R.prop('drives')(config),
    price: getPrice(config),
    pricePerTB: getPricePerTB(config),
    raid: R.prop('raidConfig')(config).name,
    storage: getStorage(config),
  }
}

const minStorage = storage =>
  R.compose(
    R.gte(R.__, storage),
    R.prop('storage'),
  )
const maxPrice = price =>
  R.compose(
    R.lte(R.__, price),
    R.prop('price'),
  )
const compare = prop => (a, b) => R.prop(prop, a) - R.prop(prop, b)

const sqr = a => a * a

const createOptions = (units, drives, raidConfigs) =>
  createConfigs(units, drives, raidConfigs).map(createOption)

const options = createOptions(units, drives, raidConfigs)

const average = prop =>
  R.converge(R.divide, [
    R.compose(
      R.sum,
      R.map(R.prop(prop)),
    ),
    R.length,
  ])

const std = prop =>
  R.compose(
    Math.sqrt,
    R.converge(R.divide, [R.sum, R.length]),
    R.converge(
      (options, average) =>
        R.map(
          R.compose(
            sqr,
            R.subtract(R.__, average),
            R.prop(prop),
          ),
          options,
        ),
      [R.identity, average(prop)],
    ),
  )

const isBelowStandard = (value, prop) =>
  R.converge(
    R.compose(
      R.gt(R.__, value),
      R.subtract,
    ),
    [average(prop), std(prop)],
  )

const isAboveStandard = (value, prop) =>
  R.converge(
    R.compose(
      R.lt(R.__, value),
      R.add,
    ),
    [average(prop), std(prop)],
  )

const numberToCurrency = n =>
  n.toLocaleString('no-NO', {
    style: 'currency',
    currency: 'NOK',
  })

const prepend = b => a => `${a}${b}`

const Option = option => (
  <tr key={option.id}>
    <td>{option.unit.name}</td>
    <td>{option.unit.bays}</td>
    <td>
      {option.drives
        .map(R.prop('storage'))
        .map(prepend('TB'))
        .join(', ')}
    </td>
    <td>{option.raid}</td>
    <td
      className={
        isBelowStandard(option.storage, 'storage')(options)
          ? 'negativeOutlier'
          : isAboveStandard(option.storage, 'storage')(options)
            ? 'positiveOutlier'
            : 'standard'
      }
    >
      {option.storage}TB
    </td>
    <td
      className={
        isBelowStandard(option.pricePerTB, 'pricePerTB')(options)
          ? 'positiveOutlier'
          : isAboveStandard(option.pricePerTB, 'pricePerTB')(options)
            ? 'negativeOutlier'
            : 'standard'
      }
    >
      {numberToCurrency(option.pricePerTB)}
    </td>
    <td
      className={
        isBelowStandard(option.price, 'price')(options)
          ? 'positiveOutlier'
          : isAboveStandard(option.price, 'price')(options)
            ? 'negativeOutlier'
            : 'standard'
      }
    >
      {numberToCurrency(option.price)}
    </td>
  </tr>
)

class Table extends Component {
  constructor(props) {
    super(props)
    this.state = {
      options: props.options,
      sortBy: 'pricePerTB',
      sortDescending: false,
      units: units.map(unit => ({
        ...unit,
        toggled: true,
      })),
      drives: drives.map(drive => ({
        ...drive,
        toggled: true,
      })),
      minStorage: 8,
      maxPrice: 12000,
    }

    this.setMaxPrice = this.setMaxPrice.bind(this)
    this.setMinStorage = this.setMinStorage.bind(this)
    this.sortBy = this.sortBy.bind(this)
    this.toggleDrive = this.toggleDrive.bind(this)
    this.toggleUnit = this.toggleUnit.bind(this)
  }

  setMaxPrice(event) {
    this.setState({ maxPrice: event.target.value })
  }

  setMinStorage(event) {
    this.setState({ minStorage: event.target.value })
  }

  sortBy(prop) {
    this.setState(
      prevState =>
        prevState.sortBy === prop
          ? {
              sortDescending: !prevState.sortDescending,
              sortBy: prop,
            }
          : {
              sortDescending: false,
              sortBy: prop,
            },
    )
  }

  toggleDrive(event) {
    const target = event.target

    this.setState(prevState => ({
      drives: prevState.drives.map(
        drive =>
          drive.name === target.name
            ? {
                ...drive,
                toggled: target.checked,
              }
            : drive,
      ),
    }))
  }

  toggleUnit(event) {
    const target = event.target

    this.setState(prevState => ({
      units: prevState.units.map(
        unit =>
          unit.name === target.name
            ? {
                ...unit,
                toggled: target.checked,
              }
            : unit,
      ),
    }))
  }

  render() {
    const options = this.state.options
      .filter(option =>
        this.state.drives.some(
          drive => drive.name === option.drives[0].name && drive.toggled,
        ),
      )
      .filter(option =>
        this.state.units.some(
          unit => unit.name === option.unit.name && unit.toggled,
        ),
      )
      .filter(minStorage(this.state.minStorage))
      .filter(maxPrice(this.state.maxPrice))
      .sort(compare(this.state.sortBy))

    return (
      <div>
        <fieldset>
          <legend>Minimum storage</legend>
          <input
            type="number"
            value={this.state.minStorage}
            onChange={this.setMinStorage}
          />
        </fieldset>
        <fieldset>
          <legend>Maximum price</legend>
          <input
            type="number"
            value={this.state.maxPrice}
            onChange={this.setMaxPrice}
          />
        </fieldset>
        <fieldset>
          <legend>Units</legend>
          {this.state.units.map(unit => (
            <div key={unit.name}>
              <input
                type="checkbox"
                name={unit.name}
                checked={unit.toggled}
                onChange={this.toggleUnit}
              />
              <label htmlFor={unit.name}>
                {unit.name} ~ {numberToCurrency(unit.price)} ~{' '}
                {numberToCurrency(unit.price / unit.bays)}/bay
              </label>
            </div>
          ))}
        </fieldset>
        <fieldset>
          <legend>Drives</legend>
          {this.state.drives.map(drive => (
            <div key={drive.name}>
              <input
                type="checkbox"
                name={drive.name}
                checked={drive.toggled}
                onChange={this.toggleDrive}
              />
              <label htmlFor={drive.name}>
                {drive.name} ~ {numberToCurrency(drive.price)} ~{' '}
                {numberToCurrency(drive.price / drive.storage)}/TB
              </label>
            </div>
          ))}
        </fieldset>
        <table>
          <caption>Options</caption>
          <thead>
            <tr>
              <th>Unit</th>
              <th>Bays</th>
              <th>Drives</th>
              <th>RAID</th>
              <th onClick={() => this.sortBy('storage')}>Storage</th>
              <th onClick={() => this.sortBy('pricePerTB')}>Price/TB</th>
              <th onClick={() => this.sortBy('price')}>Price</th>
            </tr>
          </thead>
          <tbody>
            {this.state.sortDescending
              ? R.reverse(options.map(Option))
              : options.map(Option)}
          </tbody>
        </table>
      </div>
    )
  }
}

const App = () => (
  <div id="main">
    <header>
      <h1>What NAS?</h1>
    </header>
    <section>
      <Table options={createOptions(units, drives, raidConfigs)} />
    </section>
  </div>
)

export default App
