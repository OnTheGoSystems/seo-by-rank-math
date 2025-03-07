/**
 * External dependencies
 */
import moment from 'moment'
import classnames from 'classnames'
import { get, has, map, isArray } from 'lodash'
import { Link } from 'react-router-dom'
import {
	AreaChart,
	Area,
	YAxis,
	Tooltip as ChartTooltip,
	ResponsiveContainer,
} from 'recharts'

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n'
import { select } from '@wordpress/data'
import { Fragment } from '@wordpress/element'
import { Button } from '@wordpress/components'
import { applyFilters, doAction } from '@wordpress/hooks'
import { decodeEntities } from '@wordpress/html-entities'

/**
 * Internal dependencies
 */
import ItemStat from '@scShared/ItemStat'
import LinkListing from '@scShared/LinkListing'
import ScoreProgress from '@scShared/ScoreProgress'
import SchemaListing from '@scShared/SchemaListing'
import ActionListing from '@scShared/ActionListing'
import KeywordButton from '@scShared/KeywordButton'
import KeywordTitle from '@scShared/KeywordTitle'

export function isPro() {
	return applyFilters( 'rank_math_is_pro', false )
}

export function filterShownHeaders( headers, hiddenKeys ) {
	return map( headers, ( header ) => ( {
		...header,
		visible:
			header.required ||
			( has( hiddenKeys, header.key ) && hiddenKeys[ header.key ] ),
	} ) )
}

export function Capitalize( str ) {
	return str.charAt( 0 ).toUpperCase() + str.slice( 1 )
}

export function getPageOffset( page, perPage ) {
	return ( page - 1 ) * perPage
}

function getPostTypeIcons( type ) {
	const icons = {
		post: 'rm-icon-post',
		page: 'rm-icon-page',
		product: 'rm-icon-cart', // WooCommerce.
		download: 'rm-icon-cart', // Easy Digital Download.
		'web-story': 'rm-icon-stories', // Google Web Stories.
		topic: 'rm-icon-users', // bbPress topic.
	}

	return classnames(
		'post-type rm-icon',
		has( icons, type ) ? icons[ type ] : 'rm-icon-post'
	)
}

export function processRows( rows, columns, offset = 0, trackedKeywords ) {
	let counter = 0

	return map( rows, ( row, rowID ) =>
		map( columns, ( column ) => {
			let value = get( row, column, '' )
			let display = ''

			if ( 'sequenceOnly' === column ) {
				display = ++counter + offset
			} else if ( 'sequence' === column ) {
				value = get( row, 'object_subtype', 'post' )
				display = (
					<Fragment>
						{ ++counter + offset }{ ' ' }
						<i
							className={ getPostTypeIcons( value ) }
							title={ Capitalize( value ) }
						/>
					</Fragment>
				)
			} else if ( 'sequenceAdd' === column ) {
				const isTracked =
					trackedKeywords && trackedKeywords.includes( rowID )
				display = <KeywordButton
					isTracked={ isTracked }
					sequence={ ++counter + offset }
					query={ row.query }
				/>
			} else if ( 'sequenceDelete' === column ) {
				display = <Fragment>
					{ ++counter + offset }
					<Button
						className="button button-secondary button-small add-keyword delete"
						title={ __( 'Delete from Keyword Manager', 'rank-math' ) }
						onClick={ () => doAction( 'rank_math_remove_keyword', row.query ) }
					>
						<i className="rm-icon rm-icon-trash" />
					</Button>
				</Fragment>
			} else if ( 'title' === column ) {
				value = value || rowID
				display = (
					<h4>
						<Link to={ '/single/' + get( row, 'object_id', '' ) }>
							<span>{ decodeEntities( value ) }</span>
							<small>{ row.page }</small>
						</Link>
					</h4>
				)
			} else if ( 'query' === column ) {
				display = <KeywordTitle query={ value } />
			} else if ( 'seo_score' === column ) {
				display = <ScoreProgress score={ value } />
			} else if ( 'schemas_in_use' === column ) {
				display = <SchemaListing schemas={ value } type={ row.object_subtype } />
				value = isArray( value ) ? value.join( ' ' ) : ''
			} else if (
				'impressions' === column ||
				'pageviews' === column ||
				'clicks' === column ||
				'ctr' === column
			) {
				display = <ItemStat { ...value } />
				value = value.difference
			} else if ( 'position' === column ) {
				display = <ItemStat { ...value } revert={ true } />
				value = value.difference
			} else if ( 'positionHistory' === column ) {
				const graph = get( row, 'graph', false )
				let baseValue = 'dataMax'
				if ( graph !== false ) {
					const dataMax = Math.max( ...graph.map( ( item ) => item.position ) )
					baseValue = Math.min( dataMax + parseInt( dataMax / 2 ), 100 )
				}
				display =
					false === graph ? (
						''
					) : (
						<div className="rank-math-graph">
							<ResponsiveContainer height={ 40 }>
								<AreaChart
									data={ graph }
									baseValue={ baseValue }
									margin={ {
										top: 0,
										right: 0,
										left: 0,
										bottom: 0,
									} }
								>
									<ChartTooltip
										wrapperClassName="rank-math-graph-tooltip"
										labelFormatter={ ( index ) =>
											moment(
												get(
													graph,
													[ index, 'date' ],
													''
												)
											).format( 'D MMM, YYYY' )
										}
									/>
									<defs>
										<linearGradient
											id="gradient"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor="#4e8cde"
												stopOpacity={ 0.2 }
											/>
											<stop
												offset="95%"
												stopColor="#4e8cde"
												stopOpacity={ 0 }
											/>
										</linearGradient>
									</defs>
									<Area
										dataKey="position"
										stroke="#4e8cde"
										strokeWidth={ 2 }
										fill="url(#gradient)"
									/>
									<YAxis
										hide={ true }
										reversed={ true }
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					)
			} else if ( 'links' === column ) {
				display = <LinkListing links={ value } />
				value = ''
			} else if ( 'actions' === column ) {
				display = <ActionListing actions={ value } />
				value = value.join( ' ' )
			}

			return { display, value }
		} )
	)
}

export function generateTicks( data ) {
	const ticks = []
	const dataLength = data.length
	const days = select( 'rank-math' ).getDaysRange()
	const tickCount = {
		'-7 days': 5,
		'-15 days': 3,
		'-30 days': 3,
		'-3 months': 11,
		'-6 months': 4,
		'-1 year': 10,
	}

	for ( let i = 1; i <= tickCount[ days ]; i++ ) {
	}

	ticks.push( data[ 0 ].date )
	ticks.push( data[ dataLength - 1 ].date )

	return ticks
}

export function filtersToUrlParams( filters ) {
	let params = ''
	map( filters, ( val, key ) => {
		if ( val ) {
			params += '&' + key + '=1'
		}
	} )
	return params
}
